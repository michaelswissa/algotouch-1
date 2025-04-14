import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import PaymentForm from '@/components/payment/PaymentForm';

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
  const { user } = useAuth();
  const { fullName, email } = useSubscriptionContext();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState(650);

  const initiateCardcomPayment = async () => {
    if (!user) {
      toast.error('יש להתחבר כדי להמשיך');
      return;
    }

    setIsLoading(true);
    try {
      let operationType = 3; // Default: token creation only (for monthly trial)
      
      if (selectedPlan === 'annual') {
        operationType = 2; // Charge and create token
      } else if (selectedPlan === 'vip') {
        operationType = 1; // Charge only
      }

      const { data, error } = await supabase.functions.invoke('cardcom-payment/create-payment', {
        body: {
          planId: selectedPlan,
          userId: user.id,
          fullName: fullName || '',
          email: email || user.email || '',
          operationType,
          successRedirectUrl: `${window.location.origin}/subscription?step=4&success=true&plan=${selectedPlan}`,
          errorRedirectUrl: `${window.location.origin}/subscription?step=3&error=true&plan=${selectedPlan}`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.url) {
        setPaymentUrl(data.url);
      } else {
        throw new Error('לא התקבלה כתובת תשלום מהשרת');
      }
    } catch (error: any) {
      console.error('Error initiating Cardcom payment:', error);
      toast.error(error.message || 'שגיאה ביצירת עסקה');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const success = params.get('success');
    
    if (error === 'true') {
      toast.error('התשלום נכשל, אנא נסה שנית');
    } else if (success === 'true') {
      toast.success('התשלום התקבל בהצלחה!');
      onPaymentComplete();
    }
  }, [onPaymentComplete]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIframeHeight(700);
      } else {
        setIframeHeight(650);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      {!paymentUrl ? (
        <Card className="max-w-lg mx-auto" dir="rtl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>תשלום</CardTitle>
            </div>
            <CardDescription>
              {selectedPlan === 'monthly' 
                ? 'הירשם למנוי חודשי עם חודש ניסיון חינם' 
                : selectedPlan === 'annual' 
                  ? 'הירשם למנוי שנתי עם 25% הנחה' 
                  : 'הירשם למנוי VIP לכל החיים'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {selectedPlan === 'monthly' 
                  ? 'המנוי כולל חודש ניסיון חינם. החיוב הראשון יתבצע רק לאחר 30 יום.'
                  : selectedPlan === 'annual' 
                    ? 'המנוי השנתי משקף חיסכון של 3 חודשים בהשוואה למנוי חודשי.' 
                    : 'מנוי VIP הוא תשלום חד פעמי המעניק גישה לכל החיים.'}
              </AlertDescription>
            </Alert>
            
            <PaymentForm 
              planId={selectedPlan}
              onPaymentComplete={onPaymentComplete}
            />
            
            <div className="flex flex-col items-center mt-6 space-y-2">
              <p className="text-center text-sm text-muted-foreground">לחלופין, ניתן לשלם באמצעות כרטיס אשראי ישירות במערכת סליקה מאובטחת:</p>
              <Button
                variant="outline"
                onClick={initiateCardcomPayment}
                disabled={isLoading}
                className="mt-2"
              >
                {isLoading ? 'מעבד...' : 'המשך לתשלום מאובטח של Cardcom'}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={onBack}>
              חזור
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card className="max-w-3xl mx-auto overflow-hidden" dir="rtl">
          <CardHeader className="pb-0">
            <CardTitle>פרטי תשלום</CardTitle>
            <CardDescription>אנא מלא את פרטי התשלום בטופס המאובטח</CardDescription>
          </CardHeader>
          <CardContent className="mt-4 p-0">
            <iframe 
              src={paymentUrl}
              width="100%"
              height={iframeHeight}
              frameBorder="0"
              title="Cardcom Payment Form"
              className="w-full"
            />
          </CardContent>
          <CardFooter className="flex justify-start">
            <Button 
              variant="outline" 
              onClick={() => setPaymentUrl(null)}
              className="mt-2"
            >
              חזור לבחירת שיטת תשלום
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default PaymentSection;
