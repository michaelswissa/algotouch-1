
import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lowProfileCode, setLowProfileCode] = useState<string | null>(null);
  const masterFrameRef = useRef<HTMLIFrameElement>(null);
  const cardNumberFrameRef = useRef<HTMLIFrameElement>(null);
  const cvvFrameRef = useRef<HTMLIFrameElement>(null);
  const [cardOwnerName, setCardOwnerName] = useState('');
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Load the Cardcom 3DS script
    const script = document.createElement('script');
    const time = new Date().getTime();
    script.src = `https://secure.cardcom.solutions/External/OpenFields/3DS.js?v=${time}`;
    document.head.appendChild(script);
    
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    // Listen for messages from iframes
    const handleFrameMessages = (event: MessageEvent) => {
      // Validate message source
      if (!event.origin.includes('cardcom.solutions')) {
        return;
      }

      const msg = event.data;
      
      if (!msg || typeof msg !== 'object') return;

      switch (msg.action) {
        case "HandleSubmit":
          console.log("Payment submission successful:", msg);
          handleSubmitResult(msg.data);
          break;
        case "HandleEror":
          console.error("Payment error:", msg);
          setIsProcessing(false);
          onError(msg.message || "חלה שגיאה בעיבוד התשלום");
          break;
        case "handleValidations":
          // Handle validation messages for card number and CVV
          if (msg.field === "cvv") {
            setCvvFieldClass(msg.isValid);
          }
          if (msg.field === "cardNumber") {
            setCardNumberClass(msg.isValid);
          }
          // Update form validity based on all validations
          updateFormValidity();
          break;
        default:
          break;
      }
    };

    window.addEventListener("message", handleFrameMessages);
    return () => {
      window.removeEventListener("message", handleFrameMessages);
    };
  }, [onError, onSuccess]);

  const updateFormValidity = () => {
    const isValid = cardOwnerName.trim().length > 0 && 
                   expirationMonth.length === 2 && 
                   expirationYear.length === 2;
    setIsFormValid(isValid);
  };

  useEffect(() => {
    updateFormValidity();
  }, [cardOwnerName, expirationMonth, expirationYear]);

  useEffect(() => {
    if (isInitialized || !user) return;
    
    const initializePayment = async () => {
      try {
        setIsLoading(true);
        
        // Create a low profile deal through our Edge Function
        const { data, error } = await supabase.functions.invoke('cardcom-openfields', {
          body: {
            amount: amount,
            planId: planId,
            productName: `מנוי ${planName}`,
            operation: "ChargeOnly",
            language: "he",
            successUrl: window.location.href + "?success=true",
            errorUrl: window.location.href + "?error=true"
          }
        });
        
        if (error) {
          console.error('Error creating payment session:', error);
          onError('שגיאה ביצירת עסקה - נסה שנית מאוחר יותר');
          return;
        }
        
        if (!data || !data.LowProfileId) {
          console.error('Invalid response from payment service:', data);
          onError('תגובה לא תקינה מהשרת');
          return;
        }
        
        console.log('Payment session created:', data);
        setLowProfileCode(data.LowProfileId);
        
        // Initialize iframes once we have the lowProfileCode
        setTimeout(() => {
          initializeIframes(data.LowProfileId);
          setIsInitialized(true);
        }, 500);
        
      } catch (err) {
        console.error('Exception creating payment session:', err);
        onError('שגיאה בחיבור לשרת התשלומים');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializePayment();
  }, [amount, planId, planName, user, isInitialized, onError]);

  const initializeIframes = async (profileCode: string) => {
    if (!masterFrameRef.current) return;
    
    try {
      // Load CSS for the card fields
      const cardCssResponse = await fetch('/assets/styles/cardNumber.css');
      const cardCssText = await cardCssResponse.text();
      
      // CSS for CVV field
      const cvvCss = `
        body {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
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
        }
        
        .cvvField:focus {
          outline: none;
          border-color: #3182ce;
          box-shadow: 0 0 0 1px #3182ce;
        }
        
        .cvvField.invalid {
          border: 1px solid #e53e3e;
        }
      `;
      
      // CSS for reCaptcha
      const recaptchaCss = `
        body {
          margin: 0;
          padding: 0;
          display: flex;
        }
      `;
      
      // Initialize the master iframe
      const iframeMessage = {
        action: 'init',
        cardFieldCSS: cardCssText,
        cvvFieldCSS: cvvCss,
        reCaptchaFieldCSS: recaptchaCss,
        placeholder: "XXXX-XXXX-XXXX-XXXX",
        cvvPlaceholder: "CVV",
        lowProfileCode: profileCode,
        language: "he"
      };
      
      masterFrameRef.current.contentWindow?.postMessage(iframeMessage, '*');
    } catch (err) {
      console.error('Error initializing iframes:', err);
      onError('שגיאה בטעינת טופס התשלום');
    }
  };
  
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
    
    if (!isValid) {
      masterFrameRef.current.contentWindow?.postMessage({
        action: 'addCardNumberFieldClass',
        className: "invalid"
      }, '*');
    } else {
      masterFrameRef.current.contentWindow?.postMessage({
        action: 'removeCardNumberFieldClass',
        className: "invalid"
      }, '*');
    }
  };
  
  const validateCardFields = () => {
    if (!masterFrameRef.current) return;
    
    masterFrameRef.current.contentWindow?.postMessage({ 
      action: "validateCardNumber" 
    }, '*');
    
    masterFrameRef.current.contentWindow?.postMessage({ 
      action: "validateCvv" 
    }, '*');
  };
  
  const setCardOwnerDetails = () => {
    if (!masterFrameRef.current) return;
    
    const data = {
      cardOwnerName: cardOwnerName,
      cardOwnerEmail: user?.email || '',
      cardOwnerPhone: ''
    };
    
    masterFrameRef.current.contentWindow?.postMessage({ 
      action: 'setCardOwnerDetails', 
      data 
    }, '*');
  };
  
  const handleSubmitResult = (data: any) => {
    setIsProcessing(false);
    
    if (data.IsSuccess) {
      // Record successful payment in our database
      recordPayment(data)
        .then(() => {
          onSuccess(data.DealNumber || data.Id || Date.now().toString());
        })
        .catch(err => {
          console.error('Error recording payment:', err);
          // Still consider the payment successful even if recording fails
          onSuccess(data.DealNumber || data.Id || Date.now().toString());
        });
    } else {
      onError(data.Description || 'שגיאה בביצוע התשלום');
    }
  };
  
  const recordPayment = async (paymentData: any) => {
    if (!user) return;
    
    try {
      const { error } = await supabase.from('user_payment_logs').insert({
        user_id: user.id,
        token: lowProfileCode || '',
        amount: amount,
        status: 'completed',
        approval_code: paymentData.ApprovalNumber || paymentData.DealNumber,
        transaction_details: paymentData
      });
      
      if (error) {
        console.error('Error recording payment log:', error);
      }
    } catch (err) {
      console.error('Exception recording payment:', err);
    }
  };
  
  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!masterFrameRef.current || !lowProfileCode) {
      onError('טופס התשלום לא נטען כראוי. נסה שנית.');
      return;
    }
    
    validateCardFields();
    setIsProcessing(true);
    
    // Set card owner details first
    setCardOwnerDetails();
    
    // Process payment
    const formProps = {
      action: 'doTransaction',
      cardOwnerName: cardOwnerName,
      cardOwnerEmail: user?.email || '',
      expirationMonth: expirationMonth,
      expirationYear: expirationYear,
      numberOfPayments: "1"
    };
    
    masterFrameRef.current.contentWindow?.postMessage(formProps, '*');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-5" dir="rtl">
      <form onSubmit={handlePayment} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {/* Hidden iframes for Cardcom OpenFields */}
          <iframe 
            ref={masterFrameRef}
            id="CardComMasterFrame" 
            name="CardComMasterFrame"
            src="https://secure.cardcom.solutions/api/openfields/master"
            style={{ display: 'block', width: '0px', height: '0px' }}
            title="Cardcom Master Frame"
          ></iframe>
          
          <div className="space-y-2">
            <label htmlFor="cardOwnerName" className="block text-sm font-medium">
              שם בעל הכרטיס
            </label>
            <input
              type="text"
              id="cardOwnerName"
              className="w-full p-2 border rounded-md"
              value={cardOwnerName}
              onChange={(e) => setCardOwnerName(e.target.value)}
              placeholder="ישראל ישראלי"
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              מספר כרטיס אשראי
            </label>
            <iframe 
              id="CardComCardNumber" 
              name="CardComCardNumber"
              src="https://secure.cardcom.solutions/api/openfields/cardNumber"
              style={{ width: '100%', height: '44px' }}
              title="Card Number Frame"
            ></iframe>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="expirationMonth" className="block text-sm font-medium">
                חודש תפוגה
              </label>
              <input
                type="text"
                id="expirationMonth"
                className="w-full p-2 border rounded-md"
                value={expirationMonth}
                onChange={(e) => setExpirationMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="MM"
                maxLength={2}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="expirationYear" className="block text-sm font-medium">
                שנת תפוגה
              </label>
              <input
                type="text"
                id="expirationYear"
                className="w-full p-2 border rounded-md"
                value={expirationYear}
                onChange={(e) => setExpirationYear(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="YY"
                maxLength={2}
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                CVV
              </label>
              <iframe 
                id="CardComCvv" 
                name="CardComCvv"
                src="https://secure.cardcom.solutions/api/openfields/CVV"
                style={{ width: '100%', height: '44px' }}
                title="CVV Frame"
              ></iframe>
            </div>
          </div>
          
          <div className="pt-4 flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isProcessing}
            >
              ביטול
            </Button>
            
            <Button 
              type="submit" 
              disabled={!isFormValid || isProcessing}
              className="min-w-[120px]"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin mr-2">&#8635;</span>
                  מעבד...
                </>
              ) : (
                'בצע תשלום'
              )}
            </Button>
          </div>
        </div>
      </form>
      
      <div className="mt-4 text-xs text-center text-gray-500">
        <p>התשלומים מאובטחים באמצעות Cardcom</p>
        <iframe 
          id="CardcomCredits" 
          name="CardcomCredits"
          src="https://secure.cardcom.solutions/api/openfields/credits?language=he&type=short" 
          width="100%" 
          height="22px"
          style={{ zIndex: 2 }}
          title="Cardcom Credits"
        ></iframe>
      </div>
    </div>
  );
};

export default CardcomOpenFields;
