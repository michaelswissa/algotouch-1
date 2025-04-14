
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

const SubscriptionSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      setIsVerifying(true);
      
      try {
        // Get payment session from storage
        const paymentSessionStr = sessionStorage.getItem('payment_session');
        
        if (!paymentSessionStr) {
          console.error('No payment session found');
          toast.error('לא נמצאו נתוני תשלום, אנא נסה שוב');
          navigate('/subscription');
          return;
        }
        
        const paymentSession = JSON.parse(paymentSessionStr);
        
        // Check if session is too old (more than 1 hour)
        const sessionAge = Date.now() - paymentSession.timestamp;
        if (sessionAge > 60 * 60 * 1000) {
          console.error('Payment session expired');
          toast.error('פג תוקף הסשן, אנא נסה שוב');
          navigate('/subscription');
          return;
        }
        
        // Verify payment status
        const { data, error } = await supabase.functions.invoke('cardcom-check-status', {
          body: {
            sessionId: paymentSession.id,
            lowProfileId: paymentSession.lowProfileId
          }
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        if (data && data.success) {
          setPaymentVerified(true);
          setPaymentDetails(data);
          
          // Clear payment session from storage
          sessionStorage.removeItem('payment_session');
          
          // Clear registration data if present
          sessionStorage.removeItem('registration_data');
          
          toast.success('התשלום התקבל בהצלחה!');
        } else {
          throw new Error(data?.message || 'התשלום נכשל או עדיין בעיבוד');
        }
      } catch (error: any) {
        console.error('Payment verification error:', error);
        toast.error(error.message || 'אירעה שגיאה באימות התשלום');
        
        // Give the user the option to continue anyway or check again
        setPaymentVerified(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [navigate]);

  const handleContinue = () => {
    navigate('/dashboard');
  };
  
  const handleTryAgain = async () => {
    setIsVerifying(true);
    
    // Get payment session from storage and try verification again
    const paymentSessionStr = sessionStorage.getItem('payment_session');
    if (!paymentSessionStr) {
      navigate('/subscription');
      return;
    }
    
    const paymentSession = JSON.parse(paymentSessionStr);
    
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-check-status', {
        body: {
          sessionId: paymentSession.id,
          lowProfileId: paymentSession.lowProfileId
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data && data.success) {
        setPaymentVerified(true);
        setPaymentDetails(data);
        toast.success('התשלום התקבל בהצלחה!');
        
        // Clear payment session
        sessionStorage.removeItem('payment_session');
        sessionStorage.removeItem('registration_data');
      } else {
        throw new Error(data?.message || 'התשלום עדיין בעיבוד');
      }
    } catch (error: any) {
      console.error('Payment reverification error:', error);
      toast.error(error.message || 'אירעה שגיאה באימות התשלום');
      setPaymentVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Layout className="py-8">
      <div className="max-w-md mx-auto">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="flex justify-center">
              {isVerifying ? (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              ) : paymentVerified ? (
                <CheckCircle className="h-10 w-10 text-green-500" />
              ) : (
                <div className="text-amber-500">⚠️</div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isVerifying ? (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">מאמת את התשלום...</h2>
                <p className="text-muted-foreground">אנא המתן בזמן שאנו מאמתים את פרטי התשלום שלך</p>
              </div>
            ) : paymentVerified ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">התשלום בוצע בהצלחה!</h2>
                <p className="text-muted-foreground">תודה על הצטרפותך! המנוי שלך פעיל כעת.</p>
                <Button onClick={handleContinue} className="mt-4">
                  המשך למערכת <ArrowRight className="mr-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">לא הצלחנו לאמת את התשלום</h2>
                <p className="text-muted-foreground">
                  ייתכן שהתשלום עדיין מעובד. אנא נסה שוב או בדוק את פרטי המנוי שלך בחשבון.
                </p>
                <div className="flex flex-col gap-2 mt-4">
                  <Button onClick={handleTryAgain} variant="outline">
                    נסה שוב
                  </Button>
                  <Button onClick={handleContinue}>
                    המשך למערכת
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SubscriptionSuccess;
