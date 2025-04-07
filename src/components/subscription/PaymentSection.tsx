
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import PaymentForm from '@/components/payment/PaymentForm';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

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
  const [paymentMethod, setPaymentMethod] = useState<'direct' | 'iframe'>('direct');

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
        setPaymentMethod('iframe');
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

  const getPlanDetails = () => {
    if (selectedPlan === 'monthly') {
      return {
        name: 'מנוי חודשי',
        price: '$99',
        description: 'כולל חודש ניסיון חינם',
        info: 'החיוב הראשון יתבצע רק לאחר 30 יום'
      };
    } else if (selectedPlan === 'annual') {
      return {
        name: 'מנוי שנתי',
        price: '$899',
        description: 'חסכון של 25% לעומת מנוי חודשי',
        info: 'חיוב חד פעמי עבור שנה שלמה'
      };
    } else {
      return {
        name: 'מנוי VIP',
        price: '$3,499',
        description: 'תשלום חד פעמי לכל החיים',
        info: 'גישה מלאה לכל החיים ללא חיובים נוספים'
      };
    }
  };

  const planDetails = getPlanDetails();

  const renderPaymentContent = () => {
    if (paymentMethod === 'iframe' && paymentUrl) {
      return (
        <Card className="max-w-3xl mx-auto border-primary/20 shadow-lg overflow-hidden" dir="rtl">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 pb-0">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">השלם את התשלום</CardTitle>
            </div>
            <CardDescription className="text-base">
              אנא מלא את פרטי התשלום במערכת הסליקה המאובטחת
            </CardDescription>
            
            <div className="mt-4 p-3 bg-white rounded-md shadow-sm border border-muted">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-lg">{planDetails.name}</span>
                <span className="text-lg font-bold text-primary">{planDetails.price}</span>
              </div>
              <p className="text-sm text-muted-foreground">{planDetails.description}</p>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 mt-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/5 pointer-events-none"></div>
              <iframe 
                src={paymentUrl}
                width="100%"
                height={iframeHeight}
                frameBorder="0"
                title="Cardcom Payment Form"
                className="w-full"
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-start pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setPaymentMethod('direct')}
              className="mt-2 flex items-center gap-2"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4" />
              חזור לבחירת שיטת תשלום
            </Button>
          </CardFooter>
        </Card>
      );
    }
    
    return (
      <Card className="max-w-lg mx-auto border-primary/20 shadow-lg" dir="rtl">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>תשלום מאובטח</CardTitle>
          </div>
          <CardDescription>
            {selectedPlan === 'monthly' 
              ? 'הירשם למנוי חודשי עם חודש ניסיון חינם' 
              : selectedPlan === 'annual' 
                ? 'הירשם למנוי שנתי עם 25% הנחה' 
                : 'הירשם למנוי VIP לכל החיים'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-6">
          <div className="bg-muted/40 p-4 rounded-md border border-border/40">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">{planDetails.name}</span>
              <span className="font-bold text-lg">{planDetails.price}</span>
            </div>
            <p className="text-sm text-muted-foreground">{planDetails.description}</p>
            <div className="flex items-center gap-2 mt-3 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{planDetails.info}</span>
            </div>
          </div>
          
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
          
          <Tabs defaultValue="cardcom" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="cardcom">כרטיס אשראי</TabsTrigger>
              <TabsTrigger value="paypal" disabled>PayPal</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cardcom" className="space-y-4 mt-2">
              <PaymentForm 
                planId={selectedPlan}
                onPaymentComplete={onPaymentComplete}
              />
              
              <Separator className="my-4" />
              
              <div className="flex flex-col items-center space-y-4">
                <p className="text-center text-sm text-muted-foreground">לחלופין, ניתן לעבור למסך תשלום מאובטח:</p>
                <Button
                  onClick={initiateCardcomPayment}
                  disabled={isLoading}
                  variant="secondary"
                  className="w-full"
                >
                  {isLoading ? 'מעבד...' : 'עבור למסך תשלום מאובטח'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex justify-between pt-2 border-t">
          <Button variant="outline" onClick={onBack} size="sm">
            חזור
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      {renderPaymentContent()}
    </div>
  );
};

export default PaymentSection;
