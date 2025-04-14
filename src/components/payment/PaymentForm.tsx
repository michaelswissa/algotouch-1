
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import PaymentDetails from './PaymentDetails';
import PlanSummary from './PlanSummary';
import SecurityNote from './SecurityNote';
import { getSubscriptionPlans } from './utils/paymentHelpers';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete }) => {
  const navigate = useNavigate();
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);

  // Get subscription plan details
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      setRegistrationData(JSON.parse(storedData));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardNumber || !cardholderName || !expiryDate || !cvv) {
      toast.error('נא למלא את כל פרטי התשלום');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Get user data from registration or auth
      const { data: { user } } = await supabase.auth.getUser();
      const userData = user ? { userId: user.id, email: user.email } : null;
      
      // Get email from registration data or current user
      const email = registrationData?.email || user?.email;
      
      if (!email && !userData) {
        toast.error('חסרים פרטי משתמש, אנא התחבר או הירשם מחדש');
        setIsProcessing(false);
        return;
      }
      
      // Call the CardCom payment edge function
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          planId,
          userData,
          email
        }
      });
      
      if (error || !data?.success || !data?.url) {
        throw new Error(error?.message || data?.message || 'אירעה שגיאה בעיבוד התשלום');
      }
      
      console.log('Payment session created:', data);
      
      // Store the session ID in sessionStorage for post-payment verification
      sessionStorage.setItem('payment_session', JSON.stringify({
        id: data.sessionId,
        lowProfileId: data.lowProfileId,
        timestamp: Date.now()
      }));
      
      // Redirect to CardCom payment page
      window.location.href = data.url;
      
    } catch (error: any) {
      console.error('Payment processing error:', error);
      toast.error(error.message || 'אירעה שגיאה בעיבוד התשלום');
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
            displayPrice={plan.displayPrice}
            description={plan.description} 
            hasTrial={plan.hasTrial}
            freeTrialDays={plan.freeTrialDays}
          />
          
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
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isProcessing}
          >
            {isProcessing ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> מעבד...
              </span>
            ) : (
              'שלם עכשיו'
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {plan.hasTrial ? 'לא יבוצע חיוב במהלך תקופת הניסיון' : 'החיוב יבוצע מיידית'}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
};

export default PaymentForm;
