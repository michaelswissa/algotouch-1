
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const planDetails = {
    monthly: {
      name: 'חודשי',
      price: 99,
      description: 'חיוב חודשי לאחר חודש ניסיון',
    },
    annual: {
      name: 'שנתי',
      price: 899,
      description: 'חיוב שנתי לאחר חודש ניסיון',
    },
  };
  
  const plan = planId === 'annual' ? planDetails.annual : planDetails.monthly;

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Split into groups of 4 and join with spaces
    const formatted = digits.match(/.{1,4}/g)?.join(' ') || digits;
    
    return formatted;
  };

  const formatExpiryDate = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as MM/YY
    if (digits.length > 2) {
      return `${digits.substring(0, 2)}/${digits.substring(2, 4)}`;
    }
    
    return digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cardNumber || !cardholderName || !expiryDate || !cvv) {
      toast.error('נא למלא את כל פרטי התשלום');
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Store token in subscription table
      const { data: user } = await supabase.auth.getUser();
      
      if (user?.user?.id) {
        // This would use Takbull API in production
        // For now, we're simulating a successful payment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const tokenData = {
          lastFourDigits: cardNumber.slice(-4),
          expiryMonth: expiryDate.split('/')[0],
          expiryYear: `20${expiryDate.split('/')[1]}`,
          cardholderName
        };
        
        // Update subscription record
        const { error } = await supabase
          .from('subscriptions')
          .update({
            plan_type: planId,
            payment_method: tokenData,
            contract_signed: true,
            contract_signed_at: new Date().toISOString()
          })
          .eq('user_id', user.user.id);
        
        if (error) {
          throw error;
        }
        
        // Create payment history record
        await supabase.from('payment_history').insert({
          user_id: user.user.id,
          subscription_id: user.user.id, // This should be the subscription ID in a real scenario
          amount: 0, // Free trial
          status: 'trial_started',
          payment_method: tokenData
        });
        
        toast.success('התשלום נקלט בהצלחה! נרשמת לתקופת ניסיון חינם');
        onPaymentComplete();
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('אירעה שגיאה בעיבוד התשלום. נסה שנית מאוחר יותר.');
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
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center bg-muted/40 p-3 rounded-lg">
            <div>
              <h3 className="font-medium">מנוי {plan.name}</h3>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">₪{plan.price}</span>
              <p className="text-xs text-muted-foreground">לאחר חודש ניסיון חינם</p>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="card-number">מספר כרטיס</Label>
            <Input 
              id="card-number" 
              placeholder="1234 5678 9012 3456" 
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              maxLength={19}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cardholder-name">שם בעל הכרטיס</Label>
            <Input 
              id="cardholder-name" 
              placeholder="ישראל ישראלי" 
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiry-date">תוקף</Label>
              <Input 
                id="expiry-date" 
                placeholder="MM/YY" 
                value={expiryDate}
                onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                maxLength={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cvv">CVV</Label>
              <Input 
                id="cvv" 
                placeholder="123" 
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                maxLength={4}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-primary/5 p-2 rounded-md">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>כל פרטי התשלום מוצפנים ומאובטחים</span>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button type="submit" className="w-full" disabled={isProcessing}>
            {isProcessing ? 'מעבד תשלום...' : 'הירשם לתקופת ניסיון חינם'}
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
