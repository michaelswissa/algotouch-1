
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { Spinner } from "@/components/ui/spinner";
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getSubscriptionPlans } from './utils/paymentHelpers';

interface CardcomOpenFieldsProps {
  planId: string;
  planName: string;
  amount: number;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  onPaymentStart?: () => void;
}

const CARDCOM_IFRAME_URL = 'https://secure.cardcom.solutions/api/openfields';

const CardcomOpenFields: React.FC<CardcomOpenFieldsProps> = ({
  planId,
  planName,
  amount,
  onSuccess,
  onError,
  onCancel,
  onPaymentStart
}) => {
  const [lowProfileCode, setLowProfileCode] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState<boolean>(false);
  
  const masterFrameRef = useRef<HTMLIFrameElement>(null);
  const cardNumberFrameRef = useRef<HTMLIFrameElement>(null);
  const cvvFrameRef = useRef<HTMLIFrameElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  const [cardOwnerName, setCardOwnerName] = useState('');
  const [cardOwnerEmail, setCardOwnerEmail] = useState('');
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [iframesReady, setIframesReady] = useState(false);
  
  const navigate = useNavigate();

  const plans = getSubscriptionPlans();
  const plan = plans[planId as keyof typeof plans] || plans.monthly;
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success === 'true') {
      const lowProfileId = urlParams.get('lowProfileId');
      if (lowProfileId) {
        console.log('Transaction success, checking status with lowProfileId:', lowProfileId);
        checkTransactionStatus(lowProfileId);
      }
    } else if (error === 'true') {
      setError('התשלום נכשל. אנא נסה שנית.');
    }
  }, []);

  useEffect(() => {
    const getUserDetails = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();
          
          if (profile) {
            const firstName = profile.first_name || '';
            const lastName = profile.last_name || '';
            if (firstName || lastName) {
              setCardOwnerName(`${firstName} ${lastName}`.trim());
            }
            
            setCardOwnerEmail(data.user.email || '');
          } else {
            setCardOwnerEmail(data.user.email || '');
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
          setCardOwnerEmail(data.user.email || '');
        }
      }
    };
    
    getUserDetails();
    initializePaymentSession();
  }, [planId, amount]);

  useEffect(() => {
    if (lowProfileCode && masterFrameRef.current && cardNumberFrameRef.current && cvvFrameRef.current) {
      const timer = setTimeout(() => {
        console.log('Initializing iframes with lowProfileCode:', lowProfileCode);
        initializeIframeFields();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lowProfileCode]);

  const initializePaymentSession = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: registrationData } = await supabase
        .from('temp_registration_data')
        .select('*')
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      const requestData = {
        planId,
        planName,
        amount: plan.displayPrice,
        userEmail: cardOwnerEmail || (user?.email || ''),
        userName: cardOwnerName || (user?.user_metadata?.full_name || ''),
        userId: user?.id || null,
        isRegistration: !!registrationData,
        registrationData: registrationData?.registration_data || null,
        enable3DS: true // Enable 3DS processing
      };
      
      console.log('Initializing payment session with data:', requestData);
      
      const { data, error: functionError } = await supabase.functions.invoke('cardcom-openfields', {
        body: requestData
      });
      
      if (functionError) {
        console.error('Error from cardcom-openfields function:', functionError);
        throw new Error(functionError.message || 'Failed to create payment session');
      }
      
      if (!data.success || !data.lowProfileId) {
        throw new Error(data.error || 'Failed to create payment session');
      }
      
      console.log('Payment session created successfully with ID:', data.lowProfileId);
      
      setLowProfileCode(data.lowProfileId);
    } catch (error) {
      console.error('Error initializing payment session:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize payment');
      onError?.(error instanceof Error ? error.message : 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const initializeIframeFields = async () => {
    if (!masterFrameRef.current || !cardNumberFrameRef.current || !cvvFrameRef.current) {
      console.error('One or more iframe references not available');
      setError('שגיאה באתחול טופס התשלום - חסרים מרכיבי מסגרת הטופס');
      return;
    }

    if (!lowProfileCode) {
      console.error('LowProfileCode is required but not available');
      setError('שגיאה בהתחברות למערכת התשלומים. קוד עסקה חסר.');
      return;
    }

    try {
      console.log('Starting iframe initialization with lowProfileCode:', lowProfileCode);
      
      const cardNumberCssResponse = await fetch('/assets/styles/cardNumber.css');
      const cardNumberCss = await cardNumberCssResponse.text();
      
      const cvvCssResponse = await fetch('/assets/styles/cvvField.css');
      const cvvCss = await cvvCssResponse.text();

      const message = {
        action: 'init',
        lowProfileCode: lowProfileCode,
        cardFieldCSS: cardNumberCss, 
        cvvFieldCSS: cvvCss,
        placeholder: "0000 0000 0000 0000",
        cvvPlaceholder: "123",
        language: "he",
        // 3DS configuration
        is3DSEnabled: true
      };
      
      console.log('Sending initialization message to iframe:', { 
        action: message.action, 
        lowProfileCode: lowProfileCode,
        hasCardCSS: !!message.cardFieldCSS,
        hasCvvCSS: !!message.cvvFieldCSS,
        is3DSEnabled: message.is3DSEnabled
      });
      
      if (masterFrameRef.current.contentWindow) {
        masterFrameRef.current.contentWindow.postMessage(message, '*');
        console.log('Initialization message sent to iframe');
        setIframesReady(true);
      } else {
        console.error('Master iframe contentWindow not available');
        setError('שגיאה באתחול מערכת התשלום - חלון הטופס לא זמין');
      }
    } catch (error) {
      console.error('Error loading CSS files or initializing iframes:', error);
      setError('שגיאה בטעינת סגנונות הטופס');
    }
  };

  useEffect(() => {
    const handleFrameMessages = (event: MessageEvent) => {
      if (!event.origin.includes('cardcom.solutions')) {
        return;
      }
      
      const msg = event.data;
      console.log('Message from iframe:', msg);
      
      switch (msg.action) {
        case "HandleSubmit":
          console.log("Payment submitted successfully:", msg.data);
          handlePaymentSuccess(msg.data);
          break;
        case "HandleEror":
          console.error("Payment error:", msg.message);
          setProcessingPayment(false);
          setError(msg.message || 'שגיאה בעיבוד התשלום');
          onError?.(msg.message || 'שגיאה בעיבוד התשלום');
          break;
        case "handleValidations":
          if (msg.field === "cvv") {
            setCvvFieldClass(msg.isValid);
          }
          if (msg.field === "cardNumber") {
            setCardNumberClass(msg.isValid);
          }
          if (msg.field === "reCaptcha") {
            console.log('reCaptcha validation:', msg.isValid);
          }
          break;
        case "handle3DSProcess": // Handle 3DS specific events
          console.log('3DS process event:', msg.status);
          if (msg.status === 'started') {
            // The 3DS verification has started
            console.log('3DS verification process has started');
          } else if (msg.status === 'completed') {
            // The 3DS verification has completed successfully
            console.log('3DS verification completed successfully');
          } else if (msg.status === 'failed') {
            // The 3DS verification has failed
            console.error('3DS verification failed:', msg.error);
            setError('אימות 3DS נכשל: ' + (msg.error || 'שגיאה לא ידועה'));
            onError?.('אימות 3DS נכשל: ' + (msg.error || 'שגיאה לא ידועה'));
          }
          break;
        default:
          console.log('Other message from iframe:', msg);
          break;
      }
    };

    window.addEventListener("message", handleFrameMessages);
    return () => {
      window.removeEventListener("message", handleFrameMessages);
    };
  }, [onSuccess, onError]);

  const setCvvFieldClass = (isValid: boolean) => {
    if (!masterFrameRef.current) return;
    
    if (!isValid) {
      masterFrameRef.current.contentWindow?.postMessage({
        action: 'addCvvFieldClass',
        className: "invalid"
      }, '*');
    } else {
      masterFrameRef.current.contentWindow?.postMessage({
        action: 'removeCvvFieldClass',
        className: "invalid"
      }, '*');
    }
  };

  const setCardNumberClass = (isValid: boolean) => {
    if (!masterFrameRef.current) return;
    
    if (isValid) {
      masterFrameRef.current.contentWindow?.postMessage({ 
        action: 'removeCardNumberFieldClass', 
        className: "invalid" 
      }, '*');
    } else {
      masterFrameRef.current.contentWindow?.postMessage({ 
        action: 'addCardNumberFieldClass', 
        className: "invalid" 
      }, '*');
    }
  };

  const validateFields = () => {
    let isValid = true;
    
    if (!cardOwnerName.trim()) {
      setError('שם בעל הכרטיס הוא שדה חובה');
      isValid = false;
    } else if (!expirationMonth || !expirationYear) {
      setError('תאריך תפוגה הוא שדה חובה');
      isValid = false;
    } else if (!/^\d{2}$/.test(expirationMonth) || parseInt(expirationMonth) < 1 || parseInt(expirationMonth) > 12) {
      setError('חודש תפוגה לא תקין');
      isValid = false;
    } else if (!/^\d{2}$/.test(expirationYear)) {
      setError('שנת תפוגה לא תקינה');
      isValid = false;
    }
    
    if (masterFrameRef.current) {
      masterFrameRef.current.contentWindow?.postMessage({ action: "validateCardNumber" }, '*');
      masterFrameRef.current.contentWindow?.postMessage({ action: "validateCvv" }, '*');
    }
    
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!lowProfileCode) {
      setError('לא ניתן לבצע תשלום - חסר קוד חיוב (lowProfileCode)');
      return;
    }
    
    if (!validateFields()) {
      return;
    }
    
    if (!iframesReady) {
      setError('טופס התשלום עדיין בטעינה. אנא המתן רגע ונסה שוב.');
      return;
    }
    
    setProcessingPayment(true);
    setError(null);
    
    if (onPaymentStart) {
      onPaymentStart();
    }
    
    if (!masterFrameRef.current) {
      setError('שגיאה באתחול טופס התשלום');
      setProcessingPayment(false);
      return;
    }
    
    const cardOwnerData = {
      cardOwnerName,
      cardOwnerEmail,
      cardOwnerPhone: ''
    };
    
    console.log('Setting card owner details:', cardOwnerData);
    masterFrameRef.current.contentWindow?.postMessage({ 
      action: 'setCardOwnerDetails', 
      data: cardOwnerData 
    }, '*');
    
    const formProps = {
      action: 'doTransaction',
      lowProfileCode: lowProfileCode,
      cardOwnerName,
      cardOwnerEmail,
      expirationMonth,
      expirationYear,
      cardOwnerId: '000000000',
      cardOwnerPhone: '',
      numberOfPayments: "1",
      document: createDocument(),
      is3DSEnabled: true  // Enable 3DS for the transaction
    };
    
    console.log('Submitting payment transaction with params:', {
      action: formProps.action,
      lowProfileCode: lowProfileCode,
      cardOwnerName: formProps.cardOwnerName,
      hasExpiry: !!formProps.expirationMonth && !!formProps.expirationYear,
      hasDocument: !!formProps.document,
      is3DSEnabled: formProps.is3DSEnabled
    });
    
    masterFrameRef.current.contentWindow?.postMessage(formProps, '*');
  };

  const createDocument = () => {
    return {
      Name: cardOwnerName || "Customer",
      Email: cardOwnerEmail || "",
      IsSendByEmail: true,
      IsAllowEditDocument: false,
      IsShowOnlyDocument: false,
      Language: "he",
      Products: [{
        Description: planName || "Subscription Plan",
        Quantity: 1,
        UnitCost: amount,
        TotalLineCost: amount,
        IsVatFree: false
      }]
    };
  };

  const handlePaymentSuccess = (data: any) => {
    setProcessingPayment(false);
    
    if (!data || !data.IsSuccess) {
      setError(data?.Description || 'התשלום נכשל ללא שגיאה ספציפית');
      onError?.(data?.Description || 'התשלום נכשל ללא שגיאה ספציפית');
      return;
    }
    
    console.log('Payment successful:', data);
    
    if (onSuccess && data.TranzactionId) {
      onSuccess(data.TranzactionId.toString());
    } else {
      navigate(`/subscription?success=true&planId=${planId}&lowProfileId=${lowProfileCode}`);
    }
  };

  const checkTransactionStatus = async (lowProfileId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-check-status', {
        body: { lowProfileId }
      });
      
      if (error) {
        console.error('Error checking transaction status:', error);
        throw new Error(error.message);
      }
      
      console.log('Transaction status:', data);
      
      if (data.ResponseCode === 0 && data.TranzactionInfo?.TranzactionId) {
        handlePaymentSuccess({
          IsSuccess: true,
          TranzactionId: data.TranzactionInfo.TranzactionId,
          Description: data.Description
        });
      } else if (data.ResponseCode !== 0) {
        setError(data.Description || 'התשלום נכשל');
        onError?.(data.Description || 'התשלום נכשל');
      }
    } catch (error) {
      console.error('Error checking transaction status:', error);
      setError(error instanceof Error ? error.message : 'שגיאה באימות סטטוס התשלום');
    }
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="mt-4 text-center">מאתחל טופס תשלום...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={onCancel} className="mx-2">
            בחר אמצעי תשלום אחר
          </Button>
          <Button variant="default" onClick={() => initializePaymentSession()} className="mx-2">
            נסה שוב
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 space-y-4" dir="rtl">
      <iframe 
        id="CardComMasterFrame" 
        name="CardComMasterFrame"
        ref={masterFrameRef}
        src={`${CARDCOM_IFRAME_URL}/master`}
        style={{ display: 'none', width: '0px', height: '0px' }} 
      />
      
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="cardOwnerName" className="block text-sm font-medium">
              שם בעל הכרטיס
            </label>
            <input
              id="cardOwnerName"
              type="text"
              value={cardOwnerName}
              onChange={(e) => setCardOwnerName(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-primary focus:border-primary bg-white text-black"
              placeholder="שם מלא כפי שמופיע על הכרטיס"
              disabled={processingPayment || !lowProfileCode}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="cardOwnerEmail" className="block text-sm font-medium">
              דוא"ל
            </label>
            <input
              id="cardOwnerEmail"
              type="email"
              value={cardOwnerEmail}
              onChange={(e) => setCardOwnerEmail(e.target.value)}
              className="w-full p-2 border rounded-md focus:ring-primary focus:border-primary bg-white text-black"
              placeholder="your@email.com"
              disabled={processingPayment || !lowProfileCode}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="CardComCardNumber" className="block text-sm font-medium">
            מספר כרטיס אשראי
          </label>
          {lowProfileCode && (
            <iframe
              id="CardComCardNumber"
              name="CardComCardNumber"
              ref={cardNumberFrameRef}
              src={`${CARDCOM_IFRAME_URL}/cardNumber`}
              style={{ width: '100%', height: '40px', border: 'none', backgroundColor: 'white' }}
              title="Card Number"
            />
          )}
          {!lowProfileCode && (
            <div className="w-full p-2 border rounded-md h-[40px] bg-gray-100">
              <div className="flex justify-center items-center h-full">
                <Spinner className="h-4 w-4 mr-2" />
                <span className="text-sm text-gray-500">טוען...</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label htmlFor="expirationMonth" className="block text-sm font-medium">
              חודש תפוגה
            </label>
            <input
              id="expirationMonth"
              type="text"
              value={expirationMonth}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                setExpirationMonth(value);
              }}
              className="w-full p-2 border rounded-md focus:ring-primary focus:border-primary bg-white text-black"
              placeholder="MM"
              disabled={processingPayment || !lowProfileCode}
              required
              maxLength={2}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="expirationYear" className="block text-sm font-medium">
              שנת תפוגה
            </label>
            <input
              id="expirationYear"
              type="text"
              value={expirationYear}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                setExpirationYear(value);
              }}
              className="w-full p-2 border rounded-md focus:ring-primary focus:border-primary bg-white text-black"
              placeholder="YY"
              disabled={processingPayment || !lowProfileCode}
              required
              maxLength={2}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="CardComCvv" className="block text-sm font-medium">
              קוד אבטחה (CVV)
            </label>
            {lowProfileCode && (
              <iframe
                id="CardComCvv"
                name="CardComCvv"
                ref={cvvFrameRef}
                src={`${CARDCOM_IFRAME_URL}/CVV`}
                style={{ width: '100%', height: '40px', border: 'none', backgroundColor: 'white' }}
                title="CVV"
              />
            )}
            {!lowProfileCode && (
              <div className="w-full p-2 border rounded-md h-[40px] bg-gray-100">
                <div className="flex justify-center items-center h-full">
                  <Spinner className="h-4 w-4 mr-2" />
                  <span className="text-sm text-gray-500">טוען...</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground mt-2 text-center">
          <p>התשלום מאובטח ומתבצע באמצעות Cardcom עם אבטחת 3DS</p>
        </div>
        
        <div className="flex justify-center pt-4">
          <Button 
            type="submit" 
            className="w-full md:w-auto px-8"
            disabled={processingPayment || !lowProfileCode || !iframesReady}
          >
            {processingPayment ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                מעבד תשלום...
              </>
            ) : (
              'בצע תשלום'
            )}
          </Button>
        </div>
      </form>
      
      {!loading && !error && (
        <div className="bg-muted/30 p-3 rounded-md mt-2">
          <p className="text-sm font-medium mb-1">פרטי חיוב:</p>
          {planId === 'monthly' ? (
            <p className="text-sm text-muted-foreground">
              חודש ראשון חינם, לאחר מכן חיוב של <span className="font-semibold">₪371</span> מדי חודש
            </p>
          ) : planId === 'annual' ? (
            <p className="text-sm text-muted-foreground">
              חיוב חד פעמי של <span className="font-semibold">₪3,371</span> עכשיו, ולאחר מכן חידוש שנתי במחיר זהה
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              תשלום חד פעמי של <span className="font-semibold">₪13,121</span> לגישה ללא הגבלת זמן
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CardcomOpenFields;
