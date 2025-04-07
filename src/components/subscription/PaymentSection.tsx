
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, AlertCircle, ArrowLeft, CheckCircle, Gift, Shield, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

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

  // Automatically create iframe payment URL on component mount
  useEffect(() => {
    initiateCardcomPayment();
  }, []);

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
  const isMonthlyPlan = selectedPlan === 'monthly';

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="text-center p-8 border-primary/30 shadow-lg">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 rounded-full border-4 border-t-primary animate-spin"></div>
            <CardTitle className="text-2xl">מכין את מסך התשלום...</CardTitle>
            <CardDescription className="text-lg">אנא המתן, אנחנו מכינים את טופס התשלום המאובטח</CardDescription>
          </div>
        </Card>
      </div>
    );
  }

  if (!paymentUrl) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="text-center p-8 border-destructive/30 shadow-lg">
          <div className="flex flex-col items-center justify-center space-y-4">
            <AlertCircle className="h-16 w-16 text-destructive" />
            <CardTitle>שגיאה בהכנת מסך התשלום</CardTitle>
            <CardDescription>אירעה שגיאה בעת הכנת מסך התשלום. אנא נסה שנית.</CardDescription>
            <Button onClick={initiateCardcomPayment} className="mt-2">נסה שנית</Button>
            <Button variant="outline" onClick={onBack} className="mt-2">חזור</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="max-w-3xl mx-auto border-primary/30 shadow-xl overflow-hidden hover-glow" dir="rtl">
        {/* Improved Card Header with gradient */}
        <CardHeader className="bg-gradient-to-r from-primary/20 to-primary/5 pb-6 border-b border-primary/20">
          <div className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl font-bold">השלם את התשלום</CardTitle>
          </div>
          <CardDescription className="text-base mt-1">
            אנא מלא את פרטי התשלום במערכת הסליקה המאובטחת
          </CardDescription>
          
          {/* Enhanced Plan Summary Box with premium design */}
          <div className="mt-6 rounded-lg overflow-hidden shadow-lg border-2 border-primary/30">
            {/* Header with gradient background */}
            <div className="bg-gradient-to-r from-primary/30 to-primary/10 p-4 border-b border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-2xl font-bold">{planDetails.name}</h3>
                  {isMonthlyPlan && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-green-600/20 text-green-700 dark:bg-green-500/30 dark:text-green-400 border border-green-600/30 px-3 py-1 flex items-center gap-1.5 animate-pulse-subtle">
                        <Gift className="h-3.5 w-3.5" />
                        <span>30 ימים חינם!</span>
                      </Badge>
                    </div>
                  )}
                </div>
                
                {/* Price tag with floating effect */}
                <div className="bg-primary/15 border border-primary/30 p-3 rounded-lg shadow-md transform hover:scale-105 transition-transform duration-200">
                  <div className="text-2xl font-black text-primary">{planDetails.price}</div>
                  <div className="text-xs text-muted-foreground text-center">{isMonthlyPlan ? 'לאחר תקופת הניסיון' : 'סה״כ לתשלום'}</div>
                </div>
              </div>
            </div>
            
            {/* Plan features and benefits */}
            <div className="bg-gradient-to-br from-background to-primary/5 p-4">
              <p className="text-sm font-medium mb-3">{planDetails.description}</p>
              
              {/* Key benefits with icons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 mb-4">
                <div className="flex items-center bg-primary/10 p-2 rounded-md border border-primary/20">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span className="text-xs">גישה מלאה לכל התכנים</span>
                </div>
                <div className="flex items-center bg-primary/10 p-2 rounded-md border border-primary/20">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span className="text-xs">תמיכה טכנית 24/7</span>
                </div>
                <div className="flex items-center bg-primary/10 p-2 rounded-md border border-primary/20">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  <span className="text-xs">ביטול בכל עת</span>
                </div>
              </div>
              
              {/* Payment schedule info with animation */}
              <div className="flex items-center gap-2 mt-2 bg-primary/10 px-4 py-2 rounded-full w-fit border border-primary/20 shadow-sm">
                {isMonthlyPlan ? (
                  <>
                    <Gift className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">{planDetails.info}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">{planDetails.info}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        {/* Improved payment iframe container */}
        <CardContent className="p-0">
          <div className="relative">
            {/* Payment form title */}
            <div className="px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">טופס תשלום מאובטח</h3>
              </div>
              
              {/* Security badges */}
              <div className="flex flex-wrap gap-3 items-center mb-2">
                <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs border border-green-200 dark:border-green-900/30">
                  <ShieldCheck className="h-3 w-3" />
                  <span>SSL מאובטח</span>
                </div>
                <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-xs border border-blue-200 dark:border-blue-900/30">
                  <CreditCard className="h-3 w-3" />
                  <span>תשלום מוצפן</span>
                </div>
                <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded text-xs border border-purple-200 dark:border-purple-900/30">
                  <ShieldCheck className="h-3 w-3" />
                  <span>PCI DSS</span>
                </div>
              </div>
            </div>
            
            {/* Enhanced iframe container with shadow and border */}
            <div className="relative bg-gradient-to-b from-primary/5 to-transparent p-4 sm:p-6">
              <div className="relative rounded-lg overflow-hidden border-2 border-primary/20 shadow-xl hover:shadow-2xl transition-shadow duration-300">
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
            </div>
          </div>
        </CardContent>
        
        {/* Enhanced footer with trust elements */}
        <CardFooter className="flex flex-col sm:flex-row justify-between py-4 px-6 border-t border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="flex items-center gap-2 border-primary/30 hover:bg-primary/10 mb-3 sm:mb-0"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4" />
            חזור
          </Button>
          
          {/* Security notice section */}
          <Alert className="flex-1 mx-0 sm:mx-4 py-2 px-3 border-primary/30 bg-primary/5">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs font-medium">
                העסקה מאובטחת בתקן PCI DSS ומוצפנת בטכנולוגיית SSL
              </AlertDescription>
            </div>
          </Alert>
          
          {/* Start button for mobile */}
          <div className="w-full sm:hidden mt-4">
            <Button 
              size="lg"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
              disabled={isLoading}
            >
              <span>{isMonthlyPlan ? 'התחל תקופת ניסיון' : 'המשך לתשלום'}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentSection;
