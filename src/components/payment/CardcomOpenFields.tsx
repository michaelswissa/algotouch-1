
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { getSubscriptionPlans } from './utils/paymentHelpers';

interface CardcomOpenFieldsProps {
  planId: string;
  onPaymentComplete: (transactionId: string) => void;
  onPaymentStart?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

const CardcomOpenFields: React.FC<CardcomOpenFieldsProps> = ({
  planId,
  onPaymentComplete,
  onPaymentStart,
  onError,
  onCancel
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [externalTransactionId, setExternalTransactionId] = useState<string>('');

  useEffect(() => {
    // Check for registration data
    try {
      const storedData = sessionStorage.getItem('registration_data');
      if (storedData) {
        setRegistrationData(JSON.parse(storedData));
      }
    } catch (err) {
      console.error('Error parsing registration data:', err);
    }
  }, []);

  useEffect(() => {
    const initPayment = async () => {
      if (!planId) return;
      
      try {
        setLoading(true);
        if (onPaymentStart) onPaymentStart();
        
        // Get plan details
        const plans = getSubscriptionPlans();
        const selectedPlan = plans.find(p => p.id === planId);
        
        if (!selectedPlan) {
          throw new Error('Invalid plan selected');
        }
        
        // Generate unique transaction ID
        const uniqueId = crypto.randomUUID();
        setExternalTransactionId(uniqueId);
        
        // Prepare payment data
        const paymentData = {
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          userId: user?.id || null,
          userName: user?.user_metadata?.first_name 
            ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
            : null,
          userEmail: user?.email || (registrationData?.email || ''),
          isRecurring: selectedPlan.id === 'monthly' || selectedPlan.id === 'annual',
          freeTrialDays: selectedPlan.id === 'monthly' ? 30 : 0,
          registrationData: !user?.id ? registrationData : null
        };
        
        // Call our edge function to create a payment session
        const { data, error } = await supabase.functions.invoke('cardcom-openfields', {
          body: paymentData
        });
        
        if (error) {
          throw new Error(`Error creating payment session: ${error.message}`);
        }
        
        if (!data?.lowProfileId || !data?.terminalNumber || !data?.apiName) {
          throw new Error('Invalid payment session data returned');
        }
        
        // Store some payment info in local storage for verification purposes
        localStorage.setItem('pending_payment', JSON.stringify({
          lowProfileId: data.lowProfileId,
          planId,
          timestamp: new Date().toISOString(),
          externalTransactionId: uniqueId
        }));
        
        // Construct the CardCom URL
        const cardcomUrl = new URL('https://secure.cardcom.solutions/Interface/LowProfile.aspx');
        cardcomUrl.searchParams.append('TerminalNumber', data.terminalNumber);
        cardcomUrl.searchParams.append('UserName', data.apiName);
        cardcomUrl.searchParams.append('APILevel', '10');
        cardcomUrl.searchParams.append('codepage', '65001');
        cardcomUrl.searchParams.append('Operation', paymentData.isRecurring ? '2' : '1'); // 1 = charge only, 2 = charge + token
        cardcomUrl.searchParams.append('Language', 'he');
        cardcomUrl.searchParams.append('ReturnValue', uniqueId);
        cardcomUrl.searchParams.append('SumToBill', selectedPlan.price.toString());
        cardcomUrl.searchParams.append('CoinID', '1'); // ILS
        cardcomUrl.searchParams.append('ProductName', selectedPlan.name);
        
        // Add low profile ID
        cardcomUrl.searchParams.append('LowProfileId', data.lowProfileId);
        
        // Add URLs
        const baseUrl = window.location.origin;
        cardcomUrl.searchParams.append('SuccessRedirectUrl', 
          `${baseUrl}/subscription?success=true&lowProfileId=${data.lowProfileId}&planId=${planId}`);
        cardcomUrl.searchParams.append('ErrorRedirectUrl', 
          `${baseUrl}/subscription?error=true&planId=${planId}`);
        cardcomUrl.searchParams.append('IndicatorUrl', data.webhookUrl);
        
        // Set up the iframe URL
        setIframeUrl(cardcomUrl.toString());
        
        // We'll poll the status of the payment every 5 seconds to see if it's been processed
        const pollInterval = setInterval(async () => {
          try {
            // Check if the payment has been completed
            const { data: statusData, error: statusError } = await supabase.functions.invoke('cardcom-check-status', {
              body: { lowProfileId: data.lowProfileId }
            });
            
            if (statusError) {
              console.error('Error checking payment status:', statusError);
              return;
            }
            
            console.log('Payment status check:', statusData);
            
            // Check if the payment is successful
            if (statusData.ResponseCode === 0 || 
                (statusData.OperationResponse === '0') || 
                (statusData.TranzactionInfo && statusData.TranzactionInfo.ResponseCode === 0)) {
              
              // Clear the interval
              clearInterval(pollInterval);
              
              // Complete the payment
              if (onPaymentComplete) {
                const transactionId = statusData.TranzactionId || 
                                     (statusData.TranzactionInfo && statusData.TranzactionInfo.TranzactionId) || 
                                     uniqueId;
                onPaymentComplete(transactionId);
              }
              
              // Remove the pending payment info
              localStorage.removeItem('pending_payment');
            }
          } catch (pollError) {
            console.error('Error polling payment status:', pollError);
          }
        }, 5000);
        
        // Clean up the interval when the component unmounts
        return () => clearInterval(pollInterval);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        console.error('Error initializing payment:', errorMessage);
        setError(errorMessage);
        
        if (onError) {
          onError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };
    
    initPayment().catch(err => {
      console.error('Unhandled error in initPayment:', err);
      setError('Failed to initialize payment. Please try again.');
      setLoading(false);
      
      if (onError) {
        onError('Failed to initialize payment. Please try again.');
      }
    });
  }, [planId, user, onPaymentStart, onPaymentComplete, onError, registrationData]);

  const handleCancel = () => {
    // Clear any payment data
    localStorage.removeItem('pending_payment');
    
    if (onCancel) {
      onCancel();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <Spinner size="lg" className="border-primary" />
        <span>מאתחל תשלום...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={handleCancel} variant="outline" className="w-full">
          ביטול
        </Button>
      </div>
    );
  }

  if (!iframeUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Spinner size="lg" className="border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg overflow-hidden border">
        <iframe 
          src={iframeUrl} 
          className="w-full h-[600px]" 
          frameBorder="0"
          title="תשלום"
        />
      </div>
      <Button onClick={handleCancel} variant="outline" className="w-full">
        ביטול
      </Button>
    </div>
  );
};

export default CardcomOpenFields;
