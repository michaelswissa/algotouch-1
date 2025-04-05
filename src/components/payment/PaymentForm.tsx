
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import PaymentDetails from './PaymentDetails';
import PlanSummary from './PlanSummary';
import SecurityNote from './SecurityNote';
import { getSubscriptionPlans, createTokenData } from './utils/paymentHelpers';
import { registerUser } from '@/services/registration/registerUser'; 
import { TokenData, RegistrationData } from '@/types/payment';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);

  // Load registration data from session storage
  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      try {
        setRegistrationData(JSON.parse(storedData));
      } catch (e) {
        console.error("Error parsing registration data:", e);
      }
    }
  }, []);

  // Get plan details
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  // Main form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardNumber || !cardholderName || !expiryDate || !cvv) {
      toast.error('נא למלא את כל פרטי התשלום');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Create token data from card details
      const tokenData = createTokenData(cardNumber, expiryDate, cardholderName);
      
      // Two paths: registration flow or existing user flow
      if (!user) {
        await handleNewUserPayment(tokenData);
      } else {
        await handleExistingUserPayment(tokenData);
      }
      
      toast.success('התשלום התקבל בהצלחה!');
      onPaymentComplete();
    } catch (error: any) {
      console.error('Payment processing error:', error);
      toast.error(error.message || 'אירעה שגיאה בתהליך התשלום. נסה שנית.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle payment process for new users (registration flow)
  const handleNewUserPayment = async (tokenData: TokenData) => {
    if (!registrationData) {
      throw new Error('פרטי ההרשמה חסרים. אנא חזור לעמוד ההרשמה והתחל מחדש.');
    }

    console.log('Processing payment for new user with registration data:', {
      email: registrationData.email,
      planId: registrationData.planId,
      hasPlan: !!registrationData.planId
    });
    
    // First create the user with subscription
    const result = await registerUser({
      registrationData,
      tokenData,
      contractDetails: registrationData.contractDetails || null
    });
    
    if (!result.success) {
      throw result.error;
    }
    
    // Clear registration data from session storage
    sessionStorage.removeItem('registration_data');
    
    // Log in the newly created user
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: registrationData.email,
      password: registrationData.password
    });
    
    if (signInError) {
      console.error('Error signing in after registration:', signInError);
      // Continue anyway, as the registration was successful
    }
  };

  // Handle payment process for existing users
  const handleExistingUserPayment = async (tokenData: TokenData) => {
    if (!user) {
      throw new Error('משתמש לא מחובר. אנא התחבר תחילה.');
    }
    
    // Determine operation type based on plan
    let operationType = planId === 'monthly' ? 3 : // Create token only (trial)
                        planId === 'annual' ? 2 : // Charge and create token
                        1; // Charge only (VIP)
    
    console.log('Processing payment for existing user:', {
      userId: user.id,
      planId,
      operationType
    });
    
    // Create direct payment using our tokenization service
    const now = new Date();
    let trialEndsAt = null;
    let periodEndsAt = null;
    
    if (planId === 'monthly') {
      trialEndsAt = new Date(now);
      trialEndsAt.setMonth(trialEndsAt.getMonth() + 1);
    } else if (planId === 'annual') {
      periodEndsAt = new Date(now);
      periodEndsAt.setFullYear(periodEndsAt.getFullYear() + 1);
    }
    
    // Update subscription in database
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan_type: planId,
        status: planId === 'monthly' ? 'trial' : 'active',
        trial_ends_at: trialEndsAt?.toISOString() || null,
        current_period_ends_at: periodEndsAt?.toISOString() || null,
        payment_method: tokenData,
        contract_signed: true,
        contract_signed_at: now.toISOString()
      });
    
    if (subscriptionError) {
      throw new Error(`שגיאה בעדכון מנוי: ${subscriptionError.message}`);
    }
    
    // Record payment history
    const price = planDetails[planId as keyof typeof planDetails]?.price || 0;
    
    // Only create payment record for non-trial or if explicitly charging
    if (planId !== 'monthly' || operationType !== 3) {
      await supabase
        .from('payment_history')
        .insert({
          user_id: user.id,
          subscription_id: user.id,
          amount: price,
          currency: 'USD',
          status: 'completed',
          payment_method: {
            ...tokenData,
            simulated: true // Mark as simulated payment
          }
        });
    } else {
      // For trials, record a trial_started entry
      await supabase
        .from('payment_history')
        .insert({
          user_id: user.id,
          subscription_id: user.id,
          amount: 0,
          currency: 'USD',
          status: 'trial_started',
          payment_method: tokenData
        });
    }
  };

  // External payment processing with Cardcom
  const handleExternalPayment = async () => {
    if (!user && !registrationData) {
      toast.error('יש להתחבר או להשלים הרשמה כדי להמשיך');
      return;
    }
    
    setIsProcessing(true);
    try {
      let operationType = 3; // Default: token creation only (for monthly trial)
      
      if (planId === 'annual') {
        operationType = 2; // Charge and create token
      } else if (planId === 'vip') {
        operationType = 1; // Charge only
      }

      const payload: any = {
        planId,
        userId: user?.id,
        fullName: user ? undefined : `${registrationData?.userData?.firstName || ''} ${registrationData?.userData?.lastName || ''}`.trim(),
        email: user?.email || registrationData?.email,
        operationType,
        successRedirectUrl: `${window.location.origin}/subscription?step=4&success=true&plan=${planId}`,
        errorRedirectUrl: `${window.location.origin}/subscription?step=3&error=true&plan=${planId}`
      };
      
      // If we have registration data and no authenticated user, include it in the payload
      if (registrationData && !user) {
        payload.registrationData = registrationData;
      }

      const { data, error } = await supabase.functions.invoke('cardcom-payment/create-payment', {
        body: payload
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // If we have a temp registration ID, store it
        if (data.tempRegistrationId) {
          localStorage.setItem('temp_registration_id', data.tempRegistrationId);
        }
        
        // Redirect to payment page
        window.location.href = data.url;
      } else {
        throw new Error('לא התקבלה כתובת תשלום מהשרת');
      }
    } catch (error: any) {
      console.error('Error initiating external payment:', error);
      toast.error(error.message || 'שגיאה ביצירת עסקה');
      setIsProcessing(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>פרטי תשלום</CardTitle>
        </div>
        <CardDescription>הזן את פרטי כרטיס האשראי שלך לתשלום</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <PlanSummary 
            planName={plan.name} 
            price={plan.price} 
            description={plan.description}
            hasTrial={planId === 'monthly'}
          />
          
          <Separator />
          
          <PaymentDetails 
            cardNumber={cardNumber}
            setCardNumber={setCardNumber}
            cardholderName={cardholderName}
            setCardholderName={setCardholderName}
            expiryDate={expiryDate}
            setExpiryDate={setExpiryDate}
            cvv={cvv}
            setCvv={setCvv}
          />
          
          <SecurityNote />
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isProcessing}>
            {isProcessing ? 'מעבד תשלום...' : planId === 'monthly' ? 'התחל תקופת ניסיון חינם' : 'בצע תשלום'}
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-center text-muted-foreground max-w-md mx-auto mb-2">
              {planId === 'monthly' 
                ? 'ע"י לחיצה על כפתור זה, אתה מאשר את פרטי התשלום לחיוב אוטומטי לאחר תקופת הניסיון'
                : 'ע"י לחיצה על כפתור זה, אתה מאשר את ביצוע התשלום בהתאם לתנאי השימוש'}
            </p>
            
            <p className="text-center text-sm text-muted-foreground">לחלופין, ניתן לשלם באמצעות כרטיס אשראי ישירות במערכת סליקה מאובטחת:</p>
            
            <Button
              variant="outline"
              onClick={handleExternalPayment}
              disabled={isProcessing}
              className="mt-2"
            >
              {isProcessing ? 'מעבד...' : 'המשך לתשלום מאובטח'}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
};

export default PaymentForm;
