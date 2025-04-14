
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';

interface PaymentSectionProps {
  selectedPlan: string;
  onPaymentComplete: () => void;
  onBack: () => void;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({ 
  selectedPlan,
  onPaymentComplete,
  onBack
}) => {
  const navigate = useNavigate();
  const { fullName, email } = useSubscriptionContext();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDirectPayment = async () => {
    setIsProcessing(true);
    
    try {
      // Get user data
      const { data: { user } } = await supabase.auth.getUser();
      const userData = user ? { userId: user.id, email: user.email } : null;
      
      // Get email from context or current user
      const paymentEmail = email || user?.email;
      
      if (!paymentEmail && !userData) {
        toast.error('חסרים פרטי משתמש, אנא התחבר או הירשם מחדש');
        setIsProcessing(false);
        return;
      }
      
      // Call the CardCom payment edge function
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          planId: selectedPlan,
          userData,
          email: paymentEmail
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
    <div className="space-y-6">
      <div className="bg-primary/5 p-4 border border-primary/20 rounded-md">
        <h3 className="font-medium mb-2">פרטי תשלום</h3>
        <p className="text-sm text-muted-foreground mb-4">
          לצורך השלמת ההרשמה, תועבר למערכת תשלומים מאובטחת לצורך הזנת פרטי כרטיס האשראי.
        </p>
        
        <Button 
          onClick={handleDirectPayment} 
          className="w-full"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> מעבד...
            </span>
          ) : (
            'המשך לתשלום מאובטח'
          )}
        </Button>
      </div>
      
      <div className="flex justify-start">
        <Button 
          variant="outline" 
          onClick={onBack} 
          className="mx-auto"
          disabled={isProcessing}
        >
          חזור
        </Button>
      </div>
    </div>
  );
};

export default PaymentSection;
