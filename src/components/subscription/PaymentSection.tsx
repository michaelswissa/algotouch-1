
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
    setIsLoading(true);
    try {
      let operationType = 3; // Default: token creation only (for monthly trial)
      
      if (selectedPlan === 'annual') {
        operationType = 2; // Charge and create token
      } else if (selectedPlan === 'vip') {
        operationType = 1; // Charge only
      }

      // Get registration data if available (for guest checkout)
      const registrationData = sessionStorage.getItem('registration_data') 
        ? JSON.parse(sessionStorage.getItem('registration_data') || '{}')
        : null;

      if (!user && !registrationData) {
        toast.error('נדרשים פרטי הרשמה כדי להמשיך');
        setIsLoading(false);
        return;
      }

      // Prepare payload based on whether user is logged in or not
      const payload = {
        planId: selectedPlan,
        userId: user?.id,
        fullName: fullName || registrationData?.userData?.firstName + ' ' + registrationData?.userData?.lastName || '',
        email: email || user?.email || registrationData?.email || '',
        operationType,
        successRedirectUrl: `${window.location.origin}/subscription?step=4&success=true&plan=${selectedPlan}`,
        errorRedirectUrl: `${window.location.origin}/subscription?step=3&error=true&plan=${selectedPlan}`,
        // Include registration data for account creation after payment
        registrationData: registrationData
      };

      const { data, error } = await supabase.functions.invoke('cardcom-payment/create-payment', {
        body: payload
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // Store temporary registration ID if available
        if (data.tempRegistrationId) {
          localStorage.setItem('temp_registration_id', data.tempRegistrationId);
        }
        
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

  // Handle query parameters on component mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const success = params.get('success');
    const regId = params.get('regId');
    
    if (error === 'true') {
      toast.error('התשלום נכשל, אנא נסה שנית');
    } else if (success === 'true') {
      if (regId) {
        // Need to verify payment and complete registration
        verifyPaymentAndCompleteRegistration(regId);
      } else {
        toast.success('התשלום התקבל בהצלחה!');
        onPaymentComplete();
      }
    }
    
    // Always check for temp registration ID in localStorage
    const storedRegId = localStorage.getItem('temp_registration_id');
    if (storedRegId && !regId) {
      console.log('Found stored registration ID:', storedRegId);
      retrieveAndProcessRegistrationData(storedRegId);
    }
  }, [onPaymentComplete]);

  const retrieveAndProcessRegistrationData = async (registrationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-payment/get-registration-data', {
        body: { registrationId }
      });
      
      if (error || !data?.success) {
        console.error('Error retrieving registration data:', error || 'No success');
        return;
      }
      
      if (data.registrationData) {
        console.log('Retrieved registration data:', {
          email: data.registrationData.email,
          hasPassword: !!data.registrationData.password
        });
        
        // If data was already used, remove the ID from localStorage
        if (data.alreadyUsed) {
          localStorage.removeItem('temp_registration_id');
          return;
        }
        
        // Store in sessionStorage for the registration process
        sessionStorage.setItem('registration_data', JSON.stringify(data.registrationData));
        
        // Remove from localStorage
        localStorage.removeItem('temp_registration_id');
        
        // Auto-complete registration if we have all required data
        if (data.registrationData.email && data.registrationData.password) {
          const registerResult = await registerNewUser(data.registrationData);
          
          if (registerResult.success) {
            toast.success('ההרשמה והתשלום הושלמו בהצלחה!');
            onPaymentComplete();
          } else {
            toast.error('ההרשמה נכשלה, אנא נסה שנית');
            setIsLoading(false);
          }
        }
      }
    } catch (err) {
      console.error('Error processing registration data:', err);
    }
  };

  const verifyPaymentAndCompleteRegistration = async (registrationId: string) => {
    setIsLoading(true);
    try {
      // First, retrieve registration data
      const { data: regData, error: regError } = await supabase.functions.invoke('cardcom-payment/get-registration-data', {
        body: { registrationId }
      });
      
      if (regError || !regData?.success) {
        throw new Error('שגיאה בשחזור פרטי הרשמה');
      }
      
      // Store registration data for form pre-population if needed
      if (regData.registrationData) {
        sessionStorage.setItem('registration_data', JSON.stringify(regData.registrationData));
      } else {
        throw new Error('חסרים פרטי הרשמה');
      }
      
      // Try to complete the registration process
      if (regData.registrationData.email && regData.registrationData.password) {
        const registerResult = await registerNewUser(regData.registrationData);
        
        if (registerResult.success) {
          toast.success('ההרשמה והתשלום הושלמו בהצלחה!');
          onPaymentComplete();
        } else {
          toast.error(registerResult.error || 'ההרשמה נכשלה, אנא נסה שנית');
        }
      } else {
        // We need more information from the user
        toast.info('אנא השלם את פרטי ההרשמה');
      }
    } catch (error: any) {
      console.error('Error verifying payment and registration:', error);
      toast.error(error.message || 'שגיאה בהשלמת תהליך ההרשמה והתשלום');
    } finally {
      setIsLoading(false);
    }
  };

  const registerNewUser = async (registrationData: any) => {
    try {
      // Auto-create token data with basic info
      const tokenData = {
        lastFourDigits: '****',
        expiryMonth: '**',
        expiryYear: '****',
        cardholderName: `${registrationData.userData?.firstName || ''} ${registrationData.userData?.lastName || ''}`.trim(),
        simulated: true
      };
      
      // Register user 
      const { data, error } = await supabase.functions.invoke('register-user', {
        body: {
          registrationData,
          tokenData,
          contractDetails: registrationData.contractDetails || null
        }
      });
      
      if (error) throw error;
      
      // Try to sign in the user
      if (registrationData.email && registrationData.password) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: registrationData.email,
          password: registrationData.password
        });
        
        if (signInError) {
          console.error('Error signing in after registration:', signInError);
        }
      }
      
      // Clear session storage regardless of sign in result
      sessionStorage.removeItem('registration_data');
      
      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { success: false, error: error.message || 'שגיאה בתהליך ההרשמה' };
    }
  };

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
