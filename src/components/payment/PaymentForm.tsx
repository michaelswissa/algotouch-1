
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import PaymentDetails from './PaymentDetails';
import PlanSummary from './PlanSummary';
import SecurityNote from './SecurityNote';
import { getSubscriptionPlans, createTokenData } from './utils/paymentHelpers';
import { registerUser } from './RegisterUser';
import CreditCardDisplay from './CreditCardDisplay';

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
  const [isFlipped, setIsFlipped] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);

  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      setRegistrationData(JSON.parse(storedData));
    } else {
      toast.error('נתוני הרשמה חסרים, אנא חזור לדף ההרשמה');
      navigate('/auth?tab=signup');
    }
  }, [navigate]);

  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' ? planDetails.annual : planDetails.monthly;
  
  const handleCvvFocus = () => setIsFlipped(true);
  const handleCvvBlur = () => setIsFlipped(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardNumber || !cardholderName || !expiryDate || !cvv) {
      toast.error('נא למלא את כל פרטי התשלום');
      return;
    }
    
    if (!registrationData) {
      toast.error('נתוני ההרשמה חסרים, אנא התחל את תהליך ההרשמה מחדש');
      return;
    }
    
    try {
      setIsProcessing(true);
      
      const tokenData = createTokenData(cardNumber, expiryDate, cardholderName);
      
      const result = await registerUser({
        registrationData,
        tokenData
      });
      
      if (!result.success) {
        throw result.error;
      }
      
      toast.success('התשלום נקלט בהצלחה! נרשמת לתקופת ניסיון חינם');
      
      sessionStorage.removeItem('registration_data');
      
      onPaymentComplete();
    } catch (error: any) {
      console.error('Payment/registration error:', error);
      toast.error(error.message || 'אירעה שגיאה בתהליך ההרשמה. נסה שנית מאוחר יותר.');
    } finally {
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
        <CardContent className="space-y-6">
          <div className="mx-auto max-w-sm">
            <CreditCardDisplay 
              cardNumber={cardNumber}
              cardholderName={cardholderName}
              expiryDate={expiryDate}
              cvv={cvv}
              onFlip={setIsFlipped}
              isFlipped={isFlipped}
              premium={planId === 'vip'}
            />
          </div>
          
          <PlanSummary 
            planName={plan.name} 
            price={plan.price} 
            description={plan.description} 
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
            onCvvFocus={handleCvvFocus}
            onCvvBlur={handleCvvBlur}
          />
          
          <SecurityNote />
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button type="submit" className="w-full" disabled={isProcessing}>
            {isProcessing ? 'מעבד תשלום והרשמה...' : 'סיים הרשמה לתקופת ניסיון חינם'}
          </Button>
          <p className="text-xs text-center text-muted-foreground max-w-md mx-auto">
            ע"י לחיצה על כפתור זה, אתה מאשר את פרטי התשלום לחיוב אוטומטי לאחר תקופת הניסיון
          </p>
        </CardFooter>
      </form>
    </Card>
  );
};

export default PaymentForm;
