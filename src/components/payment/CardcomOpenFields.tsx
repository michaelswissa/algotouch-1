
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CardcomOpenFieldsProps {
  planId: string;
  planName: string;
  amount: number;
  onSuccess: (transactionId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

const CardcomOpenFields: React.FC<CardcomOpenFieldsProps> = ({
  planId,
  planName,
  amount,
  onSuccess,
  onError,
  onCancel
}) => {
  const [loading, setLoading] = useState(false);
  const [lowProfileCode, setLowProfileCode] = useState<string | null>(null);
  const [step, setStep] = useState<'initial' | 'processing' | 'completed'>('initial');
  
  const masterFrameRef = useRef<HTMLIFrameElement>(null);
  const cardNumberFrameRef = useRef<HTMLIFrameElement>(null);
  const cvvFrameRef = useRef<HTMLIFrameElement>(null);
  
  const [cardholderName, setCardholderName] = useState('');
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [cardholderEmail, setCardholderEmail] = useState('');
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Initialize iframes on component mount
  useEffect(() => {
    const loadIframes = async () => {
      setLoading(true);
      try {
        // Create a Low Profile deal
        const { data, error } = await supabase.functions.invoke('cardcom-openfields/create-deal', {
          body: {
            amount: amount,
            planId: planId,
            productName: planName,
            language: 'he',
            operation: 'ChargeOnly',
            successUrl: window.location.origin + '/subscription?step=4&success=true',
            errorUrl: window.location.origin + '/subscription?step=3&error=true'
          }
        });
        
        if (error) {
          console.error('Error creating Low Profile deal:', error);
          toast.error('שגיאה ביצירת עסקה');
          onError('שגיאה ביצירת עסקה');
          return;
        }
        
        if (data.ResponseCode !== 0 || !data.LowProfileId) {
          console.error('Error response from Cardcom:', data);
          toast.error(data.Description || 'שגיאה ביצירת עסקה');
          onError(data.Description || 'שגיאה ביצירת עסקה');
          return;
        }
        
        console.log('Low Profile deal created:', data);
        setLowProfileCode(data.LowProfileId);
        setStep('processing');
        
        // Wait for iframes to load before proceeding
        setTimeout(() => {
          initializeIframes(data.LowProfileId);
        }, 500);
        
      } catch (error) {
        console.error('Error during initialization:', error);
        toast.error('שגיאה בטעינת טופס התשלום');
        onError('שגיאה בטעינת טופס התשלום');
      } finally {
        setLoading(false);
      }
    };
    
    loadIframes();
    
    // Listen for messages from the iframes
    const handleFrameMessages = (event: MessageEvent) => {
      // Make sure the message comes from the Cardcom domain
      if (!event.origin.includes('cardcom.solutions')) {
        return;
      }
      
      const msg = event.data;
      console.log('Message from iframe:', msg);
      
      // Handle different message types
      if (msg.action === "HandleSubmit") {
        console.log('Payment submitted:', msg.data);
        handlePaymentResult(msg.data);
      } else if (msg.action === "HandleEror") {
        console.error('Payment error:', msg);
        toast.error(msg.message || 'שגיאה בביצוע התשלום');
        onError(msg.message || 'שגיאה בביצוע התשלום');
      } else if (msg.action === "handleValidations") {
        // Handle field validations if needed
        console.log('Validation result:', msg);
      }
    };
    
    window.addEventListener("message", handleFrameMessages);
    
    return () => {
      window.removeEventListener("message", handleFrameMessages);
    };
  }, [amount, planId, planName, onError, onSuccess]);
  
  // Initialize iframes with CSS and settings
  const initializeIframes = async (lowProfileId: string) => {
    if (!masterFrameRef.current || !masterFrameRef.current.contentWindow) {
      console.error('Master iframe not available');
      return;
    }
    
    try {
      const cardCssText = `.cardField { 
        border: 1px solid #e2e8f0; 
        border-radius: 0.375rem; 
        padding: 0.5rem; 
        width: 100%; 
        height: 36px; 
        font-size: 1rem;
      }
      .cardField:focus {
        outline: 2px solid #0891b2;
        border-color: transparent;
      }
      body { margin: 0; padding: 0; }`;
      
      const cvvCssText = `.cvvField { 
        border: 1px solid #e2e8f0; 
        border-radius: 0.375rem; 
        padding: 0.5rem; 
        width: 100%; 
        height: 36px;  
        font-size: 1rem;
      }
      .cvvField:focus {
        outline: 2px solid #0891b2;
        border-color: transparent;
      }
      body { margin: 0; padding: 0; }
      .cvvField.invalid { border: 1px solid #e11d48; }`;
      
      const reCaptchaFieldCss = `body { margin: 0; padding:0; }`;
      
      const iframeMessage = {
        action: 'init',
        cardFieldCSS: cardCssText,
        cvvFieldCSS: cvvCssText,
        reCaptchaFieldCSS: reCaptchaFieldCss,
        placeholder: "0000 0000 0000 0000",
        cvvPlaceholder: "000",
        lowProfileCode: lowProfileId,
        language: "he"
      };
      
      masterFrameRef.current.contentWindow.postMessage(iframeMessage, '*');
      setIframeLoaded(true);
      
    } catch (error) {
      console.error('Error initializing iframes:', error);
      toast.error('שגיאה בטעינת טופס התשלום');
      onError('שגיאה בטעינת טופס התשלום');
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!masterFrameRef.current || !masterFrameRef.current.contentWindow) {
      toast.error('טופס התשלום לא נטען כראוי');
      return;
    }
    
    if (!cardholderName || !expirationMonth || !expirationYear) {
      toast.error('נא למלא את כל פרטי התשלום');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Update cardholder details
      masterFrameRef.current.contentWindow.postMessage({
        action: 'setCardOwnerDetails',
        data: {
          cardOwnerName: cardholderName,
          cardOwnerEmail: cardholderEmail || undefined,
          cardOwnerPhone: undefined
        }
      }, '*');
      
      // Submit the transaction
      setTimeout(() => {
        masterFrameRef.current?.contentWindow?.postMessage({
          action: 'doTransaction',
          cardOwnerId: '000000000',
          cardOwnerName: cardholderName,
          cardOwnerEmail: cardholderEmail || undefined,
          expirationMonth: expirationMonth,
          expirationYear: expirationYear,
          numberOfPayments: "1",
        }, '*');
      }, 300);
      
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('שגיאה בביצוע התשלום');
      setSubmitting(false);
    }
  };
  
  // Handle the payment result from Cardcom
  const handlePaymentResult = async (resultData: any) => {
    console.log('Payment result data:', resultData);
    
    if (!lowProfileCode) {
      console.error('Missing lowProfileCode');
      toast.error('שגיאה באימות העסקה');
      setSubmitting(false);
      return;
    }
    
    try {
      // Check transaction status with Cardcom
      const { data, error } = await supabase.functions.invoke('cardcom-openfields/check-status', {
        body: {
          lowProfileCode: lowProfileCode
        }
      });
      
      if (error) {
        console.error('Error checking transaction status:', error);
        toast.error('שגיאה באימות העסקה');
        setSubmitting(false);
        onError('שגיאה באימות העסקה');
        return;
      }
      
      console.log('Transaction status check result:', data);
      
      // Check for success using the data from the API
      if (data.ResponseCode === 0 && (data.OperationResponse === 0 || resultData.IsSuccess)) {
        toast.success('התשלום התקבל בהצלחה!');
        setStep('completed');
        
        // Use TranzactionId for tracking
        const transactionId = data.TranzactionId || resultData.TransactionId || lowProfileCode;
        onSuccess(String(transactionId));
      } else {
        // Payment failed
        toast.error(data.Description || resultData.Description || 'התשלום נדחה');
        setSubmitting(false);
        onError(data.Description || resultData.Description || 'התשלום נדחה');
      }
    } catch (error) {
      console.error('Error processing payment result:', error);
      toast.error('שגיאה בעיבוד תוצאות התשלום');
      setSubmitting(false);
      onError('שגיאה בעיבוד תוצאות התשלום');
    }
  };
  
  // Generate month options for the expiration date select
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return (
      <option key={month} value={month.toString().padStart(2, '0')}>
        {month.toString().padStart(2, '0')}
      </option>
    );
  });
  
  // Generate year options for the expiration date select (current year + 20 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 21 }, (_, i) => {
    const year = currentYear + i;
    const shortYear = year.toString().slice(2); // Get last 2 digits
    return (
      <option key={year} value={shortYear}>
        {year}
      </option>
    );
  });
  
  return (
    <Card className="w-full max-w-xl mx-auto" dir="rtl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>פרטי תשלום</CardTitle>
        </div>
        <CardDescription>הזן את פרטי כרטיס האשראי שלך לתשלום מאובטח</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {step === 'initial' && loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground ms-3">טוען טופס תשלום מאובטח...</span>
          </div>
        )}
        
        {step === 'processing' && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                  <AlertDescription className="text-blue-700 dark:text-blue-300">
                    פרטי הכרטיס מאובטחים ואינם נשמרים על השרת שלנו
                  </AlertDescription>
                </div>
              </Alert>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cardholder-name">שם בעל הכרטיס</Label>
                  <Input
                    id="cardholder-name"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="שם מלא כפי שמופיע על הכרטיס"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="card-number">מספר כרטיס</Label>
                  {/* Cardcom Card Number iframe */}
                  <div className="h-[38px] border rounded-md overflow-hidden">
                    <iframe 
                      ref={cardNumberFrameRef}
                      id="CardComCardNumber" 
                      name="CardComCardNumber"
                      src="https://secure.cardcom.solutions/api/openfields/cardNumber"
                      style={{ width: '100%', height: '38px', border: 'none' }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiration-month">חודש תפוגה</Label>
                    <select
                      id="expiration-month"
                      value={expirationMonth}
                      onChange={(e) => setExpirationMonth(e.target.value)}
                      className="w-full h-10 px-3 py-2 text-base bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      <option value="">חודש</option>
                      {monthOptions}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expiration-year">שנת תפוגה</Label>
                    <select
                      id="expiration-year"
                      value={expirationYear}
                      onChange={(e) => setExpirationYear(e.target.value)}
                      className="w-full h-10 px-3 py-2 text-base bg-background border border-input rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      required
                    >
                      <option value="">שנה</option>
                      {yearOptions}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cvv">קוד אבטחה (CVV)</Label>
                    <div className="h-[38px] border rounded-md overflow-hidden">
                      <iframe 
                        ref={cvvFrameRef}
                        id="CardComCvv" 
                        name="CardComCvv"
                        src="https://secure.cardcom.solutions/api/openfields/CVV"
                        style={{ width: '100%', height: '38px', border: 'none' }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">אימייל (אופציונלי)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={cardholderEmail}
                    onChange={(e) => setCardholderEmail(e.target.value)}
                    placeholder="example@domain.com"
                  />
                </div>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <div className="flex flex-col space-y-2">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={submitting || !iframeLoaded}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    מעבד תשלום...
                  </>
                ) : (
                  `שלם ${amount.toFixed(2)} ₪`
                )}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full mt-2" 
                onClick={onCancel}
                disabled={submitting}
              >
                ביטול
              </Button>
              
              <p className="text-xs text-center text-muted-foreground mt-2">
                התשלום מאובטח באמצעות Cardcom בהתאם לתקן PCI DSS
              </p>
            </div>
          </form>
        )}
        
        {/* Hidden master iframe for communication */}
        <iframe 
          ref={masterFrameRef}
          id="CardComMasterFrame" 
          name="CardComMasterFrame"
          src="https://secure.cardcom.solutions/api/openfields/master"
          style={{ display: 'none', width: '0px', height: '0px', border: 'none' }}
        />
      </CardContent>
    </Card>
  );
};

export default CardcomOpenFields;
