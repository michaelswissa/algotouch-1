
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [lowProfileId, setLowProfileId] = useState('');
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get plan details
  const plans = getSubscriptionPlans();
  const selectedPlan = planId === 'monthly' ? plans.monthly : 
                      planId === 'annual' ? plans.annual : 
                      planId === 'vip' ? plans.vip : plans.monthly;

  useEffect(() => {
    // Check for registration data
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      try {
        setRegistrationData(JSON.parse(storedData));
      } catch (err) {
        console.error('Error parsing registration data:', err);
        setError('אירעה שגיאה בקריאת נתוני ההרשמה');
      }
    }
  }, []);

  const handlePaymentInitiation = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      
      if (onPaymentStart) onPaymentStart();
      
      const email = user?.email || registrationData?.email || '';
      const fullName = registrationData?.userData?.firstName && registrationData?.userData?.lastName
        ? `${registrationData.userData.firstName} ${registrationData.userData.lastName}` 
        : user?.user_metadata?.first_name && user?.user_metadata?.last_name 
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
          : 'Customer';

      if (!email) {
        throw new Error('אימייל חסר - לא ניתן להמשיך בתהליך');
      }

      // Create payment session
      const { data, error } = await supabase.functions.invoke('cardcom-openfields', {
        body: { 
          planId,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          email,
          userName: fullName,
          userId: user?.id,
          isRecurring: planId === 'monthly',
          freeTrialDays: planId === 'monthly' ? 30 : 0,
          registrationData: !user ? registrationData : null,
          successRedirectUrl: `${window.location.origin}/subscription?success=true&planId=${planId}`,
          errorRedirectUrl: `${window.location.origin}/subscription?error=true`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || !data.lowProfileId) {
        throw new Error('מזהה עסקה חסר - אנא נסה שנית');
      }

      // Save lowProfileId for later status checks
      if (data.lowProfileId) {
        setLowProfileId(data.lowProfileId);
        // Store in localStorage to help with status checking after redirect
        localStorage.setItem('payment_pending_id', data.lowProfileId);
        localStorage.setItem('payment_pending_plan', planId);
      }

      // Create contract-payment link
      const contractData = sessionStorage.getItem('contract_data');
      if (contractData) {
        try {
          const parsedContract = JSON.parse(contractData);
          
          // Store contract with payment session
          await supabase.from('payment_sessions')
            .update({
              payment_details: {
                ...data,
                contractDetails: parsedContract,
                contractSigned: true,
                contractSignedAt: new Date().toISOString()
              }
            })
            .eq('id', data.sessionId);
        } catch (err) {
          console.warn('Failed to attach contract to payment session:', err);
          // Continue anyway - not critical
        }
      }

      // Get URL from response or build it
      const paymentUrl = data.url || 
        `https://secure.cardcom.solutions/External/LowProfile.aspx?` +
        `TerminalNumber=${data.terminalNumber}&` + 
        `UserName=${data.apiName}&` +
        `APILevel=10&` +
        `ReturnValue=${data.lowProfileId}&` +
        `SumToBill=${selectedPlan.price}&` +
        `ProductName=${encodeURIComponent(selectedPlan.name)}&` +
        `Language=he&` +
        `CoinID=1&` +
        `SuccessRedirectUrl=${encodeURIComponent(`${window.location.origin}/subscription?success=true&planId=${planId}&lowProfileId=${data.lowProfileId}`)}&` +
        `ErrorRedirectUrl=${encodeURIComponent(`${window.location.origin}/subscription?error=true`)}&` +
        `IndicatorUrl=${encodeURIComponent(data.webhookUrl || `${window.location.origin}/functions/v1/cardcom-webhook`)}`;

      // Open payment page
      setPaymentUrl(paymentUrl);
      window.location.href = paymentUrl;
      
    } catch (err) {
      setIsProcessing(false);
      const errorMessage = err instanceof Error ? err.message : 'אירעה שגיאה בתהליך התשלום';
      console.error('Payment initiation error:', errorMessage);
      
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="border rounded-md p-4 bg-muted/40">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold">{selectedPlan.name}</h3>
            <p className="text-sm text-muted-foreground">{selectedPlan.description}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{selectedPlan.price} ₪</p>
            {planId === 'monthly' && (
              <p className="text-xs text-muted-foreground">חודש ראשון חינם</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Button 
          onClick={handlePaymentInitiation}
          className="w-full" 
          disabled={isProcessing}
        >
          {isProcessing ? 'מעבד...' : 'המשך לתשלום'}
        </Button>
        
        {onCancel && (
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="w-full mt-2" 
            disabled={isProcessing}
          >
            חזרה
          </Button>
        )}
      </div>
      
      <div className="text-center text-xs text-muted-foreground">
        <p>התשלום מאובטח באמצעות Cardcom</p>
        {planId === 'monthly' && (
          <p className="mt-1">לאחר חודש ניסיון, המנוי יחודש אוטומטית בעלות של {selectedPlan.price} ₪ לחודש</p>
        )}
      </div>
    </div>
  );
};

export default CardcomOpenFields;
