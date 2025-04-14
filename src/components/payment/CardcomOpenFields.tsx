
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
  const [retryCount, setRetryCount] = useState(0);
  
  // Get plan details
  const plans = getSubscriptionPlans();
  const selectedPlan = planId === 'monthly' ? plans.monthly : 
                      planId === 'annual' ? plans.annual : 
                      planId === 'vip' ? plans.vip : plans.monthly;

  useEffect(() => {
    // Check for registration data
    try {
      const storedData = sessionStorage.getItem('registration_data');
      if (storedData) {
        console.log('Found registration data in CardcomOpenFields');
        setRegistrationData(JSON.parse(storedData));
      }
    } catch (err) {
      console.error('Error parsing registration data:', err);
      setError('אירעה שגיאה בקריאת נתוני ההרשמה');
    }
  }, []);

  // Function to handle retry logic
  const retryPaymentInitiation = async () => {
    if (retryCount >= 3) {
      setError('מספר נסיונות החיבור למערכת הסליקה נכשל. אנא נסה מאוחר יותר או צור קשר עם התמיכה.');
      return;
    }
    
    setRetryCount(prevCount => prevCount + 1);
    setError(null);
    await handlePaymentInitiation();
  }

  const handlePaymentInitiation = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      
      if (onPaymentStart) onPaymentStart();
      
      // Get email from user or registration data
      const email = user?.email || registrationData?.email;
      
      // Get user's full name
      const fullName = registrationData?.userData?.firstName && registrationData?.userData?.lastName
        ? `${registrationData.userData.firstName} ${registrationData.userData.lastName}` 
        : user?.user_metadata?.first_name && user?.user_metadata?.last_name 
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
          : 'Customer';

      // Validate required fields
      if (!email) {
        throw new Error('אימייל חסר - לא ניתן להמשיך בתהליך');
      }
      
      console.log('Starting payment process for:', {
        email,
        fullName,
        planId,
        userId: user?.id || 'unauthenticated',
        hasRegistrationData: !!registrationData
      });

      // Get contract data if it exists
      let contractData = null;
      try {
        const contractDataStr = sessionStorage.getItem('contract_data');
        if (contractDataStr) {
          const parsedContract = JSON.parse(contractDataStr);
          console.log('Found contract data, will store in Supabase');
          contractData = parsedContract;
        }
      } catch (err) {
        console.warn('Error parsing contract data, continuing without it:', err);
      }

      // Create payment session
      const { data, error: apiError } = await supabase.functions.invoke('cardcom-openfields', {
        body: { 
          planId,
          planName: selectedPlan.name,
          amount: selectedPlan.price,
          userEmail: email, // Explicitly send userEmail
          userName: fullName,
          userId: user?.id,
          isRecurring: planId === 'monthly',
          freeTrialDays: planId === 'monthly' ? 30 : 0,
          registrationData: !user ? registrationData : null,
          // Pass contract ID reference instead of full details
          contractDetails: contractData,
          successRedirectUrl: `${window.location.origin}/subscription?success=true&planId=${planId}`,
          errorRedirectUrl: `${window.location.origin}/subscription?error=true`
        }
      });

      console.log('Payment session creation response:', data);

      if (apiError) {
        console.error('Error from cardcom-openfields function:', apiError);
        throw new Error(apiError.message || 'אירעה שגיאה ביצירת עסקה');
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
        
        // Store creation timestamp to detect stale sessions
        localStorage.setItem('payment_session_created', new Date().toISOString());
      }

      // Use URL from response if provided
      if (data.url) {
        console.log('Redirecting to payment URL from response');
        window.location.href = data.url;
        return;
      }

      // This is a fallback, should rarely be used now
      console.log('Redirecting to constructed payment URL');
      window.location.href = `https://secure.cardcom.solutions/External/LowProfile.aspx?` +
        `TerminalNumber=${encodeURIComponent(data.terminalNumber)}&` + 
        `UserName=${encodeURIComponent(data.apiName)}&` +
        `APILevel=10&` +
        `ReturnValue=${encodeURIComponent(data.lowProfileId)}&` +
        `SumToBill=${encodeURIComponent(String(selectedPlan.price))}&` +
        `ProductName=${encodeURIComponent(selectedPlan.name)}&` +
        `Language=he&` +
        `CoinID=1&` +
        `SuccessRedirectUrl=${encodeURIComponent(`${window.location.origin}/subscription?success=true&planId=${planId}&lowProfileId=${data.lowProfileId}`)}&` +
        `ErrorRedirectUrl=${encodeURIComponent(`${window.location.origin}/subscription?error=true`)}&` +
        `IndicatorUrl=${encodeURIComponent(data.webhookUrl || `${window.location.origin}/functions/v1/cardcom-webhook`)}`;
      
    } catch (err) {
      setIsProcessing(false);
      const errorMessage = err instanceof Error ? err.message : 'אירעה שגיאה בתהליך התשלום';
      console.error('Payment initiation error:', err);
      
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      } else {
        toast.error(errorMessage);
      }

      // Auto-retry once with a delay
      if (retryCount < 1) {
        toast.info('מנסה להתחבר שוב למערכת הסליקה...', { duration: 3000 });
        setTimeout(() => retryPaymentInitiation(), 3000);
      }
    }
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent('תקלה בתהליך תשלום');
    const body = encodeURIComponent(`
שלום,

נתקלתי בבעיה בתהליך התשלום.

פרטי התקלה:
- מזהה תשלום: ${lowProfileId || 'לא ידוע'}
- סוג מנוי: ${planId || 'לא ידוע'}
- שגיאה: ${error || 'לא ידוע'}

אשמח לקבלת עזרה.
    `);
    window.location.href = `mailto:Support@algotouch.co.il?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
          
          {retryCount >= 2 && (
            <div className="mt-2 flex justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleContactSupport}
                className="text-xs"
              >
                פנה לתמיכה
              </Button>
              <Button 
                size="sm" 
                onClick={() => retryPaymentInitiation()}
                disabled={retryCount >= 3 || isProcessing}
                className="text-xs"
              >
                נסה שוב
              </Button>
            </div>
          )}
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
          disabled={isProcessing || retryCount >= 3}
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
