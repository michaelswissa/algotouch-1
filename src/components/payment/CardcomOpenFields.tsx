
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import { Spinner } from "@/components/ui/spinner";
import { Button } from '@/components/ui/button';

interface CardcomOpenFieldsProps {
  planId: string;
  planName: string;
  amount: number;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

const CARDCOM_IFRAME_URL = 'https://secure.cardcom.solutions/api/openfields';

const CardcomOpenFields: React.FC<CardcomOpenFieldsProps> = ({
  planId,
  planName,
  amount,
  onSuccess,
  onError,
  onCancel
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
  const [fieldsInitialized, setFieldsInitialized] = useState(false);
  
  const navigate = useNavigate();

  // Check URL parameters for success/error redirects from Cardcom
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const lowProfileIdParam = urlParams.get('lowProfileId');
    
    if (lowProfileIdParam) {
      checkTransactionStatus(lowProfileIdParam);
    }
  }, []);

  useEffect(() => {
    // Get user details for the form if available
    const getUserDetails = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        try {
          // Fetch profile data, handle potential error
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          
          if (profile) {
            // Build name from profile data if available
            const firstName = profile.first_name || '';
            const lastName = profile.last_name || '';
            if (firstName || lastName) {
              setCardOwnerName(`${firstName} ${lastName}`.trim());
            }
            
            // Always use email from auth user data, since profile doesn't have an email field
            setCardOwnerEmail(data.user.email || '');
          } else {
            // Fallback to user email from auth
            setCardOwnerEmail(data.user.email || '');
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
          // Fallback to user email from auth
          setCardOwnerEmail(data.user.email || '');
        }
      }
    };
    
    getUserDetails();
    initializePaymentSession();
  }, [planId, amount]);

  const initializePaymentSession = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get user data from supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: registrationData } = await supabase
        .from('temp_registration_data')
        .select('*')
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      // Prepare request data
      const requestData = {
        planId,
        planName,
        amount,
        userEmail: cardOwnerEmail || (user?.email || ''),
        userName: cardOwnerName || (user?.user_metadata?.full_name || ''),
        isRegistration: !!registrationData,
        registrationData: registrationData?.registration_data || null
      };
      
      // Call our edge function to initialize the cardcom session
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
      
      console.log('Payment session created:', data.lowProfileId);
      
      // Store the lowProfileId
      setLowProfileCode(data.lowProfileId);
      
      // Initialize the iframe fields once we have the low profile code
      if (data.lowProfileId) {
        initializeIframeFields(data.lowProfileId);
      }
    } catch (error) {
      console.error('Error initializing payment session:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize payment');
      onError?.(error instanceof Error ? error.message : 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const initializeIframeFields = (profileCode: string) => {
    if (!masterFrameRef.current || !cardNumberFrameRef.current || !cvvFrameRef.current) {
      console.error('Iframe references not available');
      return;
    }

    // Load CSS files
    const loadCssFiles = async () => {
      try {
        // Fetch card number CSS
        const cardNumberCssResponse = await fetch('/assets/styles/cardNumber.css');
        const cardNumberCss = await cardNumberCssResponse.text();
        
        // Create CVV CSS inline
        const cvvCss = `
          body {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            direction: rtl;
          }
          
          .cvvField {
            border: 1px solid #e2e8f0;
            border-radius: 0.375rem;
            height: 40px;
            margin: 0;
            padding: 0 10px;
            width: 100%;
            font-size: 0.875rem;
            background-color: white;
            color: #000; /* Dark text color for better readability */
            direction: rtl;
          }
          
          .cvvField:focus {
            outline: none;
            border-color: #3182ce;
            box-shadow: 0 0 0 1px #3182ce;
          }
          
          .cvvField.invalid {
            border: 1px solid #e53e3e;
          }
          
          input::-webkit-outer-spin-button,
          input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          
          input[type=number] {
            -moz-appearance: textfield;
          }
        `;

        // Update card number CSS to ensure text is readable
        const updatedCardNumberCss = `
          body {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            direction: rtl;
          }
          
          .cardNumberField {
            border: 1px solid #e2e8f0;
            border-radius: 0.375rem;
            height: 40px;
            margin: 0;
            padding: 0 10px;
            width: 100%;
            font-size: 0.875rem;
            background-color: white;
            color: #000; /* Dark text color for better readability */
            direction: rtl;
          }
          
          .cardNumberField:focus {
            outline: none;
            border-color: #3182ce;
            box-shadow: 0 0 0 1px #3182ce;
          }
          
          .cardNumberField.invalid {
            border: 1px solid #e53e3e;
          }
          
          input::-webkit-outer-spin-button,
          input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          
          input[type=number] {
            -moz-appearance: textfield;
          }
        `;
        
        // Post message to master iframe with initialization data
        const message = {
          action: 'init',
          lowProfileCode: profileCode,
          cardFieldCSS: updatedCardNumberCss, // Use updated CSS with readable text
          cvvFieldCSS: cvvCss,
          placeholder: "0000 0000 0000 0000",
          cvvPlaceholder: "123",
          language: "he"
        };
        
        masterFrameRef.current.contentWindow?.postMessage(message, '*');
        setFieldsInitialized(true);
      } catch (error) {
        console.error('Error loading CSS files:', error);
        setError('Failed to load form styles');
      }
    };
    
    loadCssFiles();
  };

  // Listen for messages from iframes
  useEffect(() => {
    const handleFrameMessages = (event: MessageEvent) => {
      // Check if the message is from Cardcom domains
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
          setError(msg.message || 'Payment processing failed');
          onError?.(msg.message || 'Payment processing failed');
          break;
        case "handleValidations":
          // Handle field validations
          if (msg.field === "cvv") {
            setCvvFieldClass(msg.isValid);
          }
          if (msg.field === "cardNumber") {
            setCardNumberClass(msg.isValid);
          }
          break;
        default:
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
    
    // Validate card number and CVV through iframes
    if (masterFrameRef.current) {
      masterFrameRef.current.contentWindow?.postMessage({ action: "validateCardNumber" }, '*');
      masterFrameRef.current.contentWindow?.postMessage({ action: "validateCvv" }, '*');
    }
    
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateFields()) {
      return;
    }
    
    setProcessingPayment(true);
    setError(null);
    
    if (!masterFrameRef.current) {
      setError('Error initializing payment form');
      setProcessingPayment(false);
      return;
    }
    
    // Update card holder details
    const cardOwnerData = {
      cardOwnerName,
      cardOwnerEmail,
      cardOwnerPhone: ''
    };
    
    masterFrameRef.current.contentWindow?.postMessage({ 
      action: 'setCardOwnerDetails', 
      data: cardOwnerData 
    }, '*');
    
    // Submit the payment
    const formProps = {
      action: 'doTransaction',
      cardOwnerName,
      cardOwnerEmail,
      expirationMonth,
      expirationYear,
      cardOwnerId: '000000000', // Default value to pass validation
      cardOwnerPhone: '',
      numberOfPayments: "1",
      document: createDocument()
    };
    
    console.log('Submitting payment:', formProps);
    
    masterFrameRef.current.contentWindow?.postMessage({
      ...formProps
    }, '*');
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
      setError(data?.Description || 'Payment failed without specific error');
      onError?.(data?.Description || 'Payment failed without specific error');
      return;
    }
    
    console.log('Payment successful:', data);
    
    // Call the onSuccess callback with the transaction ID
    if (onSuccess && data.TranzactionId) {
      onSuccess(data.TranzactionId.toString());
    } else {
      // If no callback is provided, redirect to success page
      navigate(`/subscription?success=true&planId=${planId}`);
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
        setError(data.Description || 'Payment failed');
        onError?.(data.Description || 'Payment failed');
      }
    } catch (error) {
      console.error('Error checking transaction status:', error);
      setError(error instanceof Error ? error.message : 'Failed to verify payment status');
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
      {/* Hidden iframes */}
      <iframe 
        id="CardComMasterFrame" 
        ref={masterFrameRef}
        src={`${CARDCOM_IFRAME_URL}/master`}
        style={{ display: 'none', width: '0px', height: '0px' }} 
      />
      
      {/* Payment Form */}
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
              disabled={processingPayment}
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
              disabled={processingPayment}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="CardComCardNumber" className="block text-sm font-medium">
            מספר כרטיס אשראי
          </label>
          <iframe
            id="CardComCardNumber"
            ref={cardNumberFrameRef}
            src={`${CARDCOM_IFRAME_URL}/cardNumber`}
            style={{ width: '100%', height: '40px', border: 'none', backgroundColor: 'white' }}
            title="Card Number"
          />
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
              disabled={processingPayment}
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
              disabled={processingPayment}
              required
              maxLength={2}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="CardComCvv" className="block text-sm font-medium">
              קוד אבטחה (CVV)
            </label>
            <iframe
              id="CardComCvv"
              ref={cvvFrameRef}
              src={`${CARDCOM_IFRAME_URL}/CVV`}
              style={{ width: '100%', height: '40px', border: 'none', backgroundColor: 'white' }}
              title="CVV"
            />
          </div>
        </div>
        
        {/* Secure payment note */}
        <div className="text-xs text-muted-foreground mt-2 text-center">
          <p>התשלום מאובטח ומתבצע באמצעות Cardcom</p>
        </div>
        
        <div className="flex justify-center pt-4">
          <Button 
            type="submit" 
            className="w-full md:w-auto px-8"
            disabled={processingPayment}
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
    </div>
  );
};

export default CardcomOpenFields;
