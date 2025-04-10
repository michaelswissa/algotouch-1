
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
import { registerUser } from './RegisterUser';

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
  const [registrationData, setRegistrationData] = useState<any>(null);

  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      setRegistrationData(JSON.parse(storedData));
    }
  }, []);

  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardNumber || !cardholderName || !expiryDate || !cvv) {
      toast.error('נא למלא את כל פרטי התשלום');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // If there's registration data, process like a new user
      if (registrationData) {
        const tokenData = createTokenData(cardNumber, expiryDate, cardholderName);
        
        const result = await registerUser({
          registrationData,
          tokenData,
          contractDetails: registrationData.contractDetails || null
        });
        
        if (!result.success) {
          throw result.error;
        }
        
        toast.success('התשלום נקלט בהצלחה! נרשמת לתקופת ניסיון חינם');
        sessionStorage.removeItem('registration_data');
        onPaymentComplete();
      } 
      // User is already logged in, process as direct payment
      else if (user) {
        // Determine operation type based on plan
        let operationType = 3; // Default: create token only (trial)
        if (planId === 'annual') {
          operationType = 2; // Charge and create token
        } else if (planId === 'vip') {
          operationType = 1; // Charge only
        }
        
        // Extract month/year from expiry date
        const [expiryMonth, expiryYear] = expiryDate.split('/');
        
        // Create direct payment using our tokenization service
        await processExistingUserPayment({
          userId: user.id,
          planId,
          cardNumber,
          expiryMonth,
          expiryYear: `20${expiryYear}`, // Convert YY to YYYY
          cardholderName,
          cvv,
          operationType
        });
        
        toast.success('התשלום התקבל בהצלחה!');
        onPaymentComplete();
      } 
      // No user and no registration data
      else {
        toast.error('אירעה שגיאה: לא ניתן לזהות את המשתמש');
        navigate('/auth?tab=login');
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      toast.error(error.message || 'אירעה שגיאה בתהליך התשלום. נסה שנית.');
    } finally {
      setIsProcessing(false);
    }
  };

  const processExistingUserPayment = async (paymentData: {
    userId: string;
    planId: string;
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cardholderName: string;
    cvv: string;
    operationType: number;
  }) => {
    // Here we would typically send the card data to a secure payment service
    // For this implementation, we'll simulate a successful payment
    
    // For direct tokenization, we would need a secure endpoint
    // In a production system, this would be handled by a PCI-compliant provider
    
    // Instead, we'll create a placeholder token and record the payment
    const tokenData = {
      lastFourDigits: paymentData.cardNumber.slice(-4),
      expiryMonth: paymentData.expiryMonth,
      expiryYear: paymentData.expiryYear,
      cardholderName: paymentData.cardholderName
    };
    
    // Store subscription and payment data
    const now = new Date();
    let periodEndsAt = null;
    let trialEndsAt = null;
    
    if (planId === 'monthly') {
      trialEndsAt = new Date(now);
      trialEndsAt.setMonth(trialEndsAt.getMonth() + 1);
    } else if (planId === 'annual') {
      periodEndsAt = new Date(now);
      periodEndsAt.setFullYear(periodEndsAt.getFullYear() + 1);
    }
    
    // Update subscription
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: paymentData.userId,
        plan_type: paymentData.planId,
        status: paymentData.planId === 'monthly' ? 'trial' : 'active',
        trial_ends_at: trialEndsAt?.toISOString() || null,
        current_period_ends_at: periodEndsAt?.toISOString() || null,
        payment_method: tokenData,
        contract_signed: true,
        contract_signed_at: now.toISOString()
      });
    
    if (subscriptionError) {
      throw new Error(`שגיאה בעדכון מנוי: ${subscriptionError.message}`);
    }
    
    // Record payment if not trial
    if (paymentData.planId !== 'monthly' || paymentData.operationType !== 3) {
      const planDetails = getSubscriptionPlans();
      const price = planDetails[paymentData.planId as keyof typeof planDetails]?.price || 0;
      
      const { error: paymentError } = await supabase
        .from('payment_history')
        .insert({
          user_id: paymentData.userId,
          subscription_id: paymentData.userId,
          amount: price,
          currency: 'USD',
          status: 'completed',
          payment_method: {
            ...tokenData,
            simulated: true // Mark this as a simulated payment
          }
        });
      
      if (paymentError) {
        console.error('Error recording payment history:', paymentError);
        // Continue anyway since the subscription was created
      }
    }
    
    return { success: true };
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
        <CardFooter className="flex flex-col space-y-2">
          <Button type="submit" className="w-full" disabled={isProcessing}>
            {isProcessing ? 'מעבד תשלום...' : planId === 'monthly' ? 'התחל תקופת ניסיון חינם' : 'בצע תשלום'}
          </Button>
          <p className="text-xs text-center text-muted-foreground max-w-md mx-auto">
            {planId === 'monthly' 
              ? 'ע"י לחיצה על כפתור זה, אתה מאשר את פרטי התשלום לחיוב אוטומטי לאחר תקופת הניסיון'
              : 'ע"י לחיצה על כפתור זה, אתה מאשר את ביצוע התשלום בהתאם לתנאי השימוש'}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
};

export default PaymentForm;
