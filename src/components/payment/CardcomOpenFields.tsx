
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, CreditCard } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert'; 
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface CardcomOpenFieldsProps {
  planId: string;
  planName: string;
  amount: number | string;
  onSuccess: (transactionId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  onPaymentStart?: () => void;
}

// Plan prices should match exactly what we expect
const PLAN_PRICES = {
  monthly: 371, // ₪371 for monthly with first month free
  annual: 3371, // ₪3,371 for annual
  vip: 13121 // ₪13,121 for VIP
};

// Process amount to a number format
const processAmount = (amount: number | string): number => {
  if (typeof amount === 'string') {
    // Remove commas and convert to number
    return Number(amount.replace(/,/g, ''));
  }
  return amount;
};

const CardcomOpenFields: React.FC<CardcomOpenFieldsProps> = ({ 
  planId, 
  planName,
  amount,
  onSuccess, 
  onError = () => {},
  onCancel = () => {},
  onPaymentStart = () => {}
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Validate amount against expected amount for plan
  const validateAmount = () => {
    const processedAmount = processAmount(amount);
    const expectedAmount = PLAN_PRICES[planId as keyof typeof PLAN_PRICES] || 0;
    
    if (Math.abs(processedAmount - expectedAmount) > 0.01) {
      console.error(`Amount validation failed: Expected ${expectedAmount}, got ${processedAmount}`);
      return false;
    }
    return true;
  };
  
  const handlePayment = async () => {
    try {
      // Validate amount first
      if (!validateAmount()) {
        onError('Invalid amount for selected plan');
        return;
      }
      
      // Start payment flow
      setLoading(true);
      onPaymentStart();
      
      const userName = user?.user_metadata?.full_name || '';
      const userEmail = user?.email || '';
      const userId = user?.id;

      // Determine if 3DS should be enabled (always for higher-value plans)
      const enable3DS = planId === 'annual' || planId === 'vip';
      
      const { data, error } = await supabase.functions.invoke('cardcom-openfields', {
        body: { 
          planId,
          planName,
          amount: processAmount(amount),
          userName,
          userEmail,
          userId,
          enable3DS
        }
      });

      if (error) {
        throw new Error(error.message);
      }
      
      if (!data.success || !data.url) {
        throw new Error(data.error || 'Failed to create payment session');
      }
      
      setSessionId(data.sessionId);
      setIframeUrl(data.url);
      
      // Log the payment start
      console.log(`Payment initiated: Plan ${planId}, Amount ${amount}, Session ${data.sessionId}`);
      
      // Store the lowProfileId in the session storage for retrieval after redirect
      sessionStorage.setItem('payment_lowProfileId', data.lowProfileId);
      sessionStorage.setItem('payment_planId', planId);
      
    } catch (error) {
      console.error('Error starting payment:', error);
      setLoading(false);
      onError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };
  
  // Check URL parameters for payment status
  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const success = params.get('success');
        const lowProfileId = sessionStorage.getItem('payment_lowProfileId');
        
        if (success === 'true' && lowProfileId) {
          // Handle the successful payment verification
          setLoading(true);
          
          const { data, error } = await supabase.functions.invoke('cardcom-check-status', {
            body: { lowProfileId }
          });
          
          if (error) {
            throw new Error(`Error checking payment status: ${error.message}`);
          }
          
          if (data.OperationResponse === 0 && data.TranzactionInfo?.TranzactionId) {
            // Clear the stored payment data
            sessionStorage.removeItem('payment_lowProfileId');
            sessionStorage.removeItem('payment_planId');
            
            // Complete the payment flow
            onSuccess(String(data.TranzactionInfo.TranzactionId));
            
            // Redirect to subscription page after successful payment
            setTimeout(() => {
              navigate('/my-subscription', { replace: true });
            }, 1500);
          } else {
            onError('Payment verification failed');
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setLoading(false);
        onError(error instanceof Error ? error.message : 'An unknown error occurred');
      }
    };
    
    checkPaymentStatus();
  }, [onSuccess, onError, navigate]);

  return (
    <div className="space-y-4">
      {!iframeUrl ? (
        <>
          <Alert className="bg-blue-50 border-blue-200 text-blue-700">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              {planId === 'monthly' 
                ? 'אתה עומד להירשם למנוי חודשי עם חודש התנסות חינם. החיוב הראשון של 371 ₪ יתבצע רק בעוד 30 יום.'
                : planId === 'annual'
                  ? 'אתה עומד להירשם למנוי שנתי בסכום של 3,371 ₪.'
                  : 'אתה עומד לרכוש מנוי VIP לכל החיים בסכום של 13,121 ₪.'
              }
            </AlertDescription>
          </Alert>
          
          <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm">
            <h3 className="text-lg font-semibold mb-3">תשלום מאובטח</h3>
            <p className="mb-6 text-muted-foreground">לחץ על הכפתור להמשך לדף התשלום המאובטח.</p>
            
            <Button 
              onClick={handlePayment} 
              disabled={loading}
              className="w-full gap-2"
              size="lg"
            >
              <CreditCard className="h-4 w-4" />
              {loading ? 'מעבד...' : 'המשך לתשלום'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <iframe
            src={iframeUrl}
            width="100%"
            height="600"
            frameBorder="0"
            title="Cardcom Payment"
            className="rounded-lg border"
          />
          
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                setIframeUrl(null);
                setSessionId(null);
                onCancel();
              }}
              disabled={loading}
            >
              ביטול
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default CardcomOpenFields;
