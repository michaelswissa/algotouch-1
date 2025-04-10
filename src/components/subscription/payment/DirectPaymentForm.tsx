
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck, CreditCard, Lock, AlarmClock, Building, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { TokenData } from '@/types/payment';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import CardcomOpenFields from '@/components/payment/CardcomOpenFields';

interface DirectPaymentFormProps {
  selectedPlan: string;
  onPaymentComplete: () => void;
  onBack: () => void;
}

/**
 * DirectPaymentForm - A PCI-compliant payment form that tokenizes card details
 * and processes them securely via the server-side Edge function
 */
const DirectPaymentForm: React.FC<DirectPaymentFormProps> = ({ 
  selectedPlan,
  onPaymentComplete,
  onBack
}) => {
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [isBusinessCustomer, setIsBusinessCustomer] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentTab, setCurrentTab] = useState('card');

  const validateCustomerInfo = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!phone || phone.length < 9) {
      newErrors.phone = 'נא להזין מספר טלפון תקין';
    }
    
    if (isBusinessCustomer) {
      if (!companyId || companyId.length < 5) {
        newErrors.companyId = 'נא להזין מספר ע.מ / ח.פ תקין';
      }
      
      if (!companyName || companyName.trim().length < 2) {
        newErrors.companyName = 'נא להזין שם חברה';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTokenReceived = async (tokenData: any) => {
    setCurrentTab('card');
    
    if (!phone) {
      setCurrentTab('customer');
      toast.info('אנא השלם את פרטי הלקוח לפני ביצוע התשלום');
      return;
    }
    
    if (!validateCustomerInfo()) {
      setCurrentTab('customer');
      toast.error('אנא תקן את השדות המסומנים');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const customerInfo = {
        phone,
        address,
        city,
        zipCode,
        isBusinessCustomer,
        companyId: isBusinessCustomer ? companyId : '',
        companyName: isBusinessCustomer ? companyName : ''
      };
      
      let registrationData = null;
      try {
        const storedData = sessionStorage.getItem('registration_data');
        if (storedData) {
          registrationData = JSON.parse(storedData);
        }
      } catch (e) {
        console.error('Error parsing registration data:', e);
      }
      
      console.log('Processing payment with token:', {
        tokenReceived: !!tokenData,
        planId: selectedPlan
      });
      
      // Process the payment using the Edge Function
      let response;
      let data;
      
      try {
        response = await supabase.functions.invoke('direct-payment', {
          body: {
            action: 'process',
            planId: selectedPlan,
            tokenData: {
              token: tokenData.token,
              lastFourDigits: tokenData.lastFourDigits,
              expiryMonth: tokenData.expiryMonth,
              expiryYear: tokenData.expiryYear,
              cardholderName: tokenData.cardholderName
            },
            customerInfo,
            registrationData
          }
        });
        
        if (response.error) {
          console.error('Payment processing error:', response.error);
          throw new Error(`Edge function error: ${response.error.message}`);
        }
        
        data = response.data;
      } catch (firstAttemptError) {
        console.error('First attempt failed, trying fallback...', firstAttemptError);
        
        try {
          response = await supabase.functions.invoke('cardcom-payment/process-payment', {
            body: {
              planId: selectedPlan,
              tokenData: {
                token: tokenData.token,
                lastFourDigits: tokenData.lastFourDigits,
                expiryMonth: tokenData.expiryMonth,
                expiryYear: tokenData.expiryYear,
                cardholderName: tokenData.cardholderName
              },
              customerInfo,
              registrationData
            }
          });
          
          if (response.error) {
            console.error('Fallback attempt error:', response.error);
            throw new Error(`Fallback error: ${response.error.message}`);
          }
          
          data = response.data;
        } catch (fallbackAttemptError) {
          console.error('Both attempts failed:', fallbackAttemptError);
          throw firstAttemptError;
        }
      }
      
      if (!data || !data.success) {
        throw new Error(data?.error || 'אירעה שגיאה בעיבוד התשלום');
      }
      
      const { tokenInfo, transactionId, documentInfo } = data;
      
      console.log('Payment successful:', { tokenInfo, transactionId, documentInfo });
      
      if (tokenInfo) {
        const tokenData: TokenData = {
          token: tokenInfo.token,
          lastFourDigits: tokenInfo.lastFourDigits || tokenData.lastFourDigits,
          expiryMonth: tokenData.expiryMonth,
          expiryYear: tokenData.expiryYear,
          cardholderName: tokenData.cardholderName
        };
        
        if (registrationData) {
          registrationData.paymentToken = tokenData;
          sessionStorage.setItem('registration_data', JSON.stringify(registrationData));
        }
        
        try {
          const sessionData = sessionStorage.getItem('subscription_flow');
          const parsedSession = sessionData 
            ? JSON.parse(sessionData) 
            : { step: 'completion' };
          
          parsedSession.step = 'completion';
          parsedSession.selectedPlan = selectedPlan;
          parsedSession.paymentComplete = true;
          
          sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
        } catch (e) {
          console.error('Error updating session flow:', e);
        }
      }
      
      if (documentInfo && documentInfo.documentUrl) {
        toast.success('התשלום התקבל בהצלחה! מסמך נשלח לדוא"ל שלך',
          {
            action: {
              label: 'הצג מסמך',
              onClick: () => window.open(documentInfo.documentUrl, '_blank')
            }
          }
        );
      } else {
        toast.success('התשלום התקבל בהצלחה!');
      }
      
      setTimeout(() => {
        setIsProcessing(false);
        onPaymentComplete();
      }, 1000);
      
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.error(`אירעה שגיאה בעיבוד התשלום: ${error.message || 'שגיאה לא ידועה'}`);
      setIsProcessing(false);
    }
  };
  
  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    toast.error(`שגיאה בעיבוד התשלום: ${error.message || 'אירעה שגיאה'}`);
    setIsProcessing(false);
  };

  const getPlanDetails = () => {
    const planDetails: Record<string, { name: string, description: string, price: number }> = {
      'monthly': {
        name: 'מנוי חודשי',
        description: 'חידוש אוטומטי מדי חודש',
        price: 99
      },
      'annual': {
        name: 'מנוי שנתי',
        description: 'חיוב שנתי אחד',
        price: 899
      },
      'vip': {
        name: 'מנוי VIP',
        description: 'גישה מלאה לכל התכונות',
        price: 3499
      }
    };
    
    return planDetails[selectedPlan] || { name: 'מנוי', description: '', price: 0 };
  };

  const planDetails = getPlanDetails();

  return (
    <Card className="border-primary/20 hover-glow transition-shadow duration-300 relative overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-primary/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">תשלום מאובטח</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
            חזרה
          </Button>
        </div>
        
        <div className="flex flex-col gap-1 mt-3">
          <h4 className="font-medium text-lg">{planDetails.name}</h4>
          <p className="text-muted-foreground text-sm">{planDetails.description}</p>
          <p className="text-xl font-semibold mt-1">${planDetails.price} USD</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center mt-3">
          <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs border border-green-200 dark:border-green-900/30">
            <ShieldCheck className="h-3 w-3" />
            <span>SSL מאובטח</span>
          </div>
          <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-xs border border-blue-200 dark:border-blue-900/30">
            <Lock className="h-3 w-3" />
            <span>PCI DSS</span>
          </div>
          <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded text-xs border border-purple-200 dark:border-purple-900/30">
            <CreditCard className="h-3 w-3" />
            <span>תשלום מוצפן</span>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        <div className="mb-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-300 flex items-start gap-2">
            <AlarmClock className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p>פרטי הכרטיס מאובטחים ומעובדים בצד הלקוח בלבד. רק טוקן מאובטח מועבר לשרת בהתאם לתקני PCI DSS.</p>
          </div>
        </div>
        
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="card" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              פרטי כרטיס
            </TabsTrigger>
            <TabsTrigger value="customer" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              פרטי לקוח
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="card">
            <CardcomOpenFields 
              onTokenReceived={handleTokenReceived}
              onError={handlePaymentError}
              isProcessing={isProcessing}
            />
          </TabsContent>
          
          <TabsContent value="customer">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">מספר טלפון</Label>
                  <Input
                    id="phone"
                    placeholder="מספר טלפון"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="text-right"
                  />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">כתובת</Label>
                  <Input
                    id="address"
                    placeholder="רחוב ומספר"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="text-right"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">עיר</Label>
                    <Input
                      id="city"
                      placeholder="עיר"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="text-right"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">מיקוד</Label>
                    <Input
                      id="zipCode"
                      placeholder="מיקוד"
                      value={zipCode}
                      onChange={e => setZipCode(e.target.value)}
                      className="text-right"
                    />
                  </div>
                </div>
                
                <div className="pt-2 space-y-4">
                  <div className="flex items-center space-x-2 space-x-reverse rtl:space-x-reverse">
                    <Checkbox 
                      id="isBusinessCustomer" 
                      checked={isBusinessCustomer} 
                      onCheckedChange={checked => setIsBusinessCustomer(!!checked)}
                    />
                    <div className="grid gap-1.5">
                      <Label htmlFor="isBusinessCustomer" className="text-base flex gap-2 items-center">
                        <Building className="h-4 w-4" /> לקוח עסקי
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        סמן אם ברצונך לקבל חשבונית מס עבור חברה/עוסק
                      </p>
                    </div>
                  </div>
                  
                  {isBusinessCustomer && (
                    <div className="pl-7 space-y-4 border-l-2 border-muted">
                      <div className="space-y-2">
                        <Label htmlFor="companyName">שם העסק</Label>
                        <Input
                          id="companyName"
                          placeholder="שם העסק/חברה"
                          value={companyName}
                          onChange={e => setCompanyName(e.target.value)}
                          className="text-right"
                        />
                        {errors.companyName && <p className="text-sm text-destructive">{errors.companyName}</p>}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="companyId">ח.פ / עוסק מורשה</Label>
                        <Input
                          id="companyId"
                          placeholder="מספר ח.פ או עוסק מורשה"
                          value={companyId}
                          onChange={e => setCompanyId(e.target.value)}
                          className="text-right"
                        />
                        {errors.companyId && <p className="text-sm text-destructive">{errors.companyId}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {Object.keys(errors).length > 0 && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  <ul className="list-disc list-inside space-y-1">
                    {Object.values(errors).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button 
                className="w-full mt-4"
                onClick={() => setCurrentTab('card')}
              >
                המשך לפרטי תשלום
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DirectPaymentForm;
