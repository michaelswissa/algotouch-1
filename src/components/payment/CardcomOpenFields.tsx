import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CardcomOpenFieldsProps {
  planId: string;
  amount?: number;
  onPaymentComplete?: (transactionId: string) => void;
  onError?: (error: string) => void;
  onPaymentStart?: () => void;
  onCancel?: () => void;
}

const CardcomOpenFields: React.FC<CardcomOpenFieldsProps> = ({
  planId,
  amount,
  onPaymentComplete,
  onError,
  onPaymentStart,
  onCancel
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lowProfileId, setLowProfileId] = useState<string | null>(null);
  const [cardcomCredentials, setCardcomCredentials] = useState<{
    terminalNumber: string;
    apiName: string;
  } | null>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);

  // Create refs for the iframe elements
  const masterFrameRef = useRef<HTMLIFrameElement>(null);
  const cardNumberFrameRef = useRef<HTMLIFrameElement>(null);
  const cvvFrameRef = useRef<HTMLIFrameElement>(null);
  const googlePayFrameRef = useRef<HTMLIFrameElement>(null);
  const creditsFrameRef = useRef<HTMLIFrameElement>(null);

  // State to track if frames are loaded
  const [masterFrameLoaded, setMasterFrameLoaded] = useState(false);
  const [cardNumberFrameLoaded, setCardNumberFrameLoaded] = useState(false);
  const [cvvFrameLoaded, setCvvFrameLoaded] = useState(false);
  const [processing3DS, setProcessing3DS] = useState(false);

  // Get registration data from session storage if available
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('registration_data');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        console.log('Found registration data in CardcomOpenFields:', parsedData);
        setRegistrationData(parsedData);
      }
    } catch (err) {
      console.error('Error parsing registration data:', err);
    }
  }, []);

  useEffect(() => {
    // Initialize the payment session when the component mounts
    initializePaymentSession();

    // Add event listener for messages from the iframe
    window.addEventListener('message', handleIframeMessages);

    // Load 3DS script
    const cardcom3DSScript = document.createElement('script');
    const time = new Date().getTime();
    cardcom3DSScript.setAttribute('src', `https://secure.cardcom.solutions/External/OpenFields/3DS.js?v=${time}`);
    document.head.appendChild(cardcom3DSScript);

    // Clean up
    return () => {
      window.removeEventListener('message', handleIframeMessages);
      if (document.head.contains(cardcom3DSScript)) {
        document.head.removeChild(cardcom3DSScript);
      }
      
      // Clean up the session if component unmounts without completing
      if (sessionId) {
        cleanupPaymentSession();
      }
    };
  }, []);

  const initializePaymentSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if we have either logged-in user OR registration data
      const isAuthenticated = !!user?.id;
      const isRegistering = !!registrationData;
      
      if (!isAuthenticated && !isRegistering) {
        console.error('No authentication or registration data found');
        throw new Error('נדרש להתחבר או להשלים את תהליך ההרשמה כדי להמשיך');
      }

      // Get user info from either authenticated user or registration data
      const userId = user?.id;
      const userName = user?.user_metadata?.name || 
                      (registrationData?.userData?.firstName && registrationData?.userData?.lastName
                        ? `${registrationData.userData.firstName} ${registrationData.userData.lastName}`
                        : '');
      const userEmail = user?.email || registrationData?.email || '';
      
      console.log('Initializing payment session with:', { 
        userId, 
        userName, 
        userEmail, 
        planId,
        isAuthenticated,
        isRegistering 
      });

      // Clean up any existing payment sessions for authenticated users
      if (userId) {
        try {
          await supabase.rpc('cleanup_user_payment_sessions', { 
            user_id_param: userId 
          });
        } catch (err) {
          console.error('Error cleaning up sessions:', err);
        }
      }
      
      // Calculate amount based on plan type
      let planAmount = amount;
      if (!planAmount) {
        switch (planId) {
          case 'monthly':
            planAmount = 99; // Monthly price (after trial) in ILS
            break;
          case 'annual':
            planAmount = 897; // Annual price in ILS
            break;
          case 'vip':
            planAmount = 1497; // VIP price in ILS
            break;
          default:
            planAmount = 0;
        }
      }
      
      // Get plan name
      let planName = '';
      switch (planId) {
        case 'monthly':
          planName = 'מנוי חודשי - חודש ניסיון חינם';
          break;
        case 'annual':
          planName = 'מנוי שנתי';
          break;
        case 'vip':
          planName = 'מנוי VIP - גישה לכל החיים';
          break;
        default:
          planName = 'מנוי';
      }

      // Call our edge function to create a payment session
      const { data, error } = await supabase.functions.invoke('cardcom-openfields', {
        body: {
          planId,
          planName,
          amount: planAmount,
          userId: userId,
          userName: userName,
          userEmail: userEmail,
          isRecurring: planId === 'monthly' || planId === 'annual',
          freeTrialDays: planId === 'monthly' ? 30 : 0,
          registrationData: !userId ? registrationData : null // Pass registration data if user is not logged in
        }
      });
      
      if (error) {
        console.error('Error creating payment session:', error);
        throw new Error(error.message);
      }
      
      if (!data || !data.lowProfileId) {
        throw new Error('לא ניתן ליצור הפעלת תשלום');
      }

      console.log('Payment session created:', data);
      setSessionId(data.sessionId);
      setLowProfileId(data.lowProfileId);
      setCardcomCredentials({
        terminalNumber: data.terminalNumber,
        apiName: data.apiName
      });
      
      // After we have the payment session data, initialize the iframes
      setTimeout(() => {
        initializeCardcomIframes(data.lowProfileId);
      }, 500);
      
    } catch (err) {
      console.error('Error initializing payment session:', err);
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת תהליך התשלום');
      if (onError) onError(err instanceof Error ? err.message : 'שגיאה ביצירת תהליך התשלום');
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupPaymentSession = async () => {
    if (sessionId) {
      try {
        await supabase
          .from('payment_sessions')
          .update({ 
            expires_at: new Date().toISOString(),
            payment_details: {
              status: 'cancelled',
              cancelled_at: new Date().toISOString()
            }
          })
          .eq('id', sessionId);
      } catch (err) {
        console.error('Error cleaning up payment session:', err);
      }
    }
  };

  const initializeCardcomIframes = (lowProfileCode: string) => {
    if (!masterFrameRef.current?.contentWindow) {
      console.error('Master iframe not loaded');
      return;
    }

    // CSS for card number field
    const cardCss = `
      .cardNumberField {
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
        height: 40px;
        width: 100%;
        padding: 0 10px;
        font-size: 16px;
        box-sizing: border-box;
        font-family: inherit;
        background-color: white;
        color: #1a202c;
        transition: border-color 0.2s;
        direction: ltr;
        text-align: left;
      }
      .cardNumberField:focus {
        border-color: #3182ce;
        outline: none;
        box-shadow: 0 0 0 2px rgba(49, 130, 206, 0.2);
      }
      .cardNumberField:hover {
        border-color: #cbd5e0;
      }
      .cardNumberField.invalid {
        border-color: #e53e3e;
      }
    `;
    
    // CSS for CVV field
    const cvvCss = `
      .cvvField {
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
        height: 40px;
        width: 100%;
        padding: 0 10px;
        font-size: 16px;
        text-align: center;
        box-sizing: border-box;
        font-family: inherit;
        background-color: white;
        color: #1a202c;
        transition: border-color 0.2s;
      }
      .cvvField:focus {
        border-color: #3182ce;
        outline: none;
        box-shadow: 0 0 0 2px rgba(49, 130, 206, 0.2);
      }
      .cvvField:hover {
        border-color: #cbd5e0;
      }
      .cvvField.invalid {
        border-color: #e53e3e;
      }
    `;

    // CSS for reCAPTCHA
    const captchaCss = `
      .reCaptchaField {
        width: 100%;
        display: flex;
        justify-content: center;
        margin-bottom: 15px;
      }
    `;

    console.log('Initializing Cardcom iframes with lowProfileCode:', lowProfileCode);

    // Initialize the master iframe with configuration
    masterFrameRef.current?.contentWindow.postMessage({
      action: 'init',
      lowProfileCode: lowProfileCode,
      cardFieldCSS: cardCss,
      cvvFieldCSS: cvvCss,
      reCaptchaFieldCSS: captchaCss,
      language: 'he',
      placeholder: '0000-0000-0000-0000',
      cvvPlaceholder: '***',
      use3DS: true, // Enable 3DS
      useReCaptcha: true, // Enable Google reCAPTCHA
      showFieldLabels: true
    }, 'https://secure.cardcom.solutions');

    console.log('Cardcom iframe initialization message sent');
    setMasterFrameLoaded(true);
  };

  // Handle messages from Cardcom iframes
  const handleIframeMessages = (event: MessageEvent) => {
    // Only accept messages from Cardcom
    if (event.origin !== 'https://secure.cardcom.solutions') {
      return;
    }

    try {
      const message = event.data;
      console.log('Message from Cardcom iframe:', message);

      if (message.action === 'handleValidations') {
        // Handle field validation results (card number, CVV, etc.)
        console.log(`Field ${message.field} validation:`, message.isValid);
      } 
      else if (message.action === 'Handle3DSProcess') {
        // 3DS process started - show loading state
        console.log('3DS process started');
        setProcessing3DS(true);
        if (onPaymentStart) onPaymentStart();
      }
      else if (message.action === 'HandleEror') {
        // Handle errors from iframe
        console.error('Cardcom error:', message);
        setIsLoading(false);
        setProcessing3DS(false);
        
        // Check for already completed transaction error
        if (message.message && message.message.includes('העסקה כבר הושלמה')) {
          toast.error('שגיאה: העסקה כבר הושלמה, אנא רענן את הדף ונסה שנית');
          
          // Clean up the session
          cleanupPaymentSession();
          
          if (onError) onError('העסקה כבר הושלמה, אנא רענן את הדף ונסה שנית');
          return;
        }
        
        setError(message.message || 'שגיאה בתהליך התשלום');
        if (onError) onError(message.message || 'שגיאה בתהליך התשלום');
      } 
      else if (message.action === 'HandleSubmit') {
        // Handle successful payment
        console.log('Payment successful:', message.data);
        setProcessing3DS(false);
        
        if (message.data && message.data.IsSuccess) {
          // Process the successful payment
          setIsLoading(false);
          
          // Record payment in our database through webhook (this happens async)
          // but we can also proceed with updating the UI
          
          // Clean up the session
          cleanupPaymentSession();
          
          // Call the onPaymentComplete callback
          if (onPaymentComplete) {
            onPaymentComplete(message.data.InternalDealNumber?.toString() || '');
          }
        } else {
          setIsLoading(false);
          setError('שגיאה בתהליך התשלום');
          if (onError) onError('שגיאה בתהליך התשלום');
        }
      }
    } catch (err) {
      console.error('Error handling iframe message:', err);
      setIsLoading(false);
      setProcessing3DS(false);
      setError('שגיאה בתהליך התשלום');
      if (onError) onError('שגיאה בעיבוד תשובת התשלום');
    }
  };

  // Handle payment submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading || !masterFrameLoaded || processing3DS) {
      return;
    }
    
    setIsLoading(true);
    if (onPaymentStart) onPaymentStart();
    
    try {
      // Get form field values
      const cardOwnerName = (document.getElementById('cardOwnerName') as HTMLInputElement)?.value;
      const cardOwnerID = (document.getElementById('cardOwnerID') as HTMLInputElement)?.value || '000000000';
      const expirationMonth = (document.getElementById('expirationMonth') as HTMLSelectElement)?.value;
      const expirationYear = (document.getElementById('expirationYear') as HTMLSelectElement)?.value;
      
      // Validate required fields
      if (!cardOwnerName || !expirationMonth || !expirationYear) {
        setIsLoading(false);
        setError('נא למלא את כל השדות הנדרשים');
        if (onError) onError('נא למלא את כל השדות הנדרשים');
        return;
      }
      
      // If the master iframe is loaded, send the transaction request
      if (masterFrameRef.current?.contentWindow) {
        // Get user email - try from authenticated user first, then registration data
        const userEmail = user?.email || registrationData?.email || '';
        
        console.log('Submitting payment with:', {
          cardOwnerName,
          cardOwnerEmail: userEmail,
          expirationMonth,
          expirationYear
        });
        
        // Set card owner details
        masterFrameRef.current.contentWindow.postMessage({
          action: 'setCardOwnerDetails',
          data: {
            cardOwnerName,
            cardOwnerEmail: userEmail,
            cardOwnerPhone: registrationData?.userData?.phone || ''
          }
        }, 'https://secure.cardcom.solutions');
        
        // Submit the payment transaction
        masterFrameRef.current.contentWindow.postMessage({
          action: 'doTransaction',
          cardOwnerId: cardOwnerID,
          cardOwnerName,
          cardOwnerEmail: userEmail,
          expirationMonth,
          expirationYear,
          numberOfPayments: "1", // Always use 1 payment through Cardcom, we handle installments differently
          use3DS: true, // Ensure 3DS is enabled
        }, 'https://secure.cardcom.solutions');
        
        console.log('Payment submission sent to Cardcom');
      } else {
        throw new Error('Cardcom iframe not initialized');
      }
    } catch (err) {
      console.error('Error submitting payment:', err);
      setIsLoading(false);
      setError('שגיאה בשליחת התשלום');
      if (onError) onError('שגיאה בשליחת התשלום');
    }
  };

  // Check for valid user cases - either authenticated or in registration process
  const isAuthenticated = !!user?.id;
  const isRegistering = !!registrationData;
  const isValidUser = isAuthenticated || isRegistering;

  if (!isValidUser) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>נדרש להתחבר או להשלים את תהליך ההרשמה כדי להמשיך</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={onCancel} className="w-full">
            חזור
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={initializePaymentSession} className="w-full">
            נסה שנית
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(isLoading || processing3DS) && (
        <div className="flex justify-center items-center py-8">
          <div className="h-8 w-8 rounded-full border-4 border-t-primary animate-spin" />
          <span className="mr-4">{processing3DS ? 'מאמת פרטי כרטיס...' : 'טוען...'}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} id="payment-form" className="space-y-4" style={{ display: isLoading || processing3DS ? 'none' : 'block' }}>
        {/* Card Owner Name */}
        <div>
          <label htmlFor="cardOwnerName" className="block text-sm font-medium mb-1">
            שם בעל הכרטיס
          </label>
          <input
            type="text"
            id="cardOwnerName"
            className="w-full p-2 border rounded-md"
            placeholder="שם מלא כפי שמופיע על הכרטיס"
            defaultValue={user?.user_metadata?.first_name && user?.user_metadata?.last_name ? 
              `${user.user_metadata.first_name} ${user.user_metadata.last_name}` : 
              registrationData?.userData?.firstName && registrationData?.userData?.lastName ?
              `${registrationData.userData.firstName} ${registrationData.userData.lastName}` : 
              ''}
            required
          />
        </div>
        
        {/* ID Number */}
        <div>
          <label htmlFor="cardOwnerID" className="block text-sm font-medium mb-1">
            מספר ת.ז.
          </label>
          <input
            type="text"
            id="cardOwnerID"
            className="w-full p-2 border rounded-md"
            placeholder="מספר תעודת זהות (אופציונלי)"
            pattern="[0-9]*"
            inputMode="numeric"
            maxLength={9}
          />
        </div>

        {/* Master iframe - hidden but necessary for initialization */}
        <iframe
          ref={masterFrameRef}
          id="CardComMasterFrame"
          src="https://secure.cardcom.solutions/External/lowProfileClearing/OpenFieldsFrame.html"
          style={{ display: 'none', width: '0px', height: '0px' }}
          title="CardCom Master Frame"
          onLoad={() => console.log('Master frame loaded')}
        />

        {/* Card Number iframe */}
        <div>
          <label htmlFor="CardComCardNumber" className="block text-sm font-medium mb-1">
            מספר כרטיס
          </label>
          <div className="relative min-h-[45px] border border-border rounded-md overflow-hidden">
            <iframe
              ref={cardNumberFrameRef}
              id="CardComCardNumber"
              name="CardComCardNumber"
              src="https://secure.cardcom.solutions/api/openfields/cardNumber"
              style={{ width: '100%', height: '45px', border: 'none' }}
              title="Credit Card Number"
              onLoad={() => setCardNumberFrameLoaded(true)}
            />
          </div>
        </div>

        {/* Card Expiration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="expirationMonth" className="block text-sm font-medium mb-1">
              חודש תפוגה
            </label>
            <select
              id="expirationMonth"
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">חודש</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month < 10 ? `0${month}` : month}>
                  {month < 10 ? `0${month}` : month}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="expirationYear" className="block text-sm font-medium mb-1">
              שנת תפוגה
            </label>
            <select
              id="expirationYear"
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">שנה</option>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() % 100 + i).map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* CVV iframe */}
        <div>
          <label htmlFor="CardComCvv" className="block text-sm font-medium mb-1">
            קוד אבטחה (CVV)
          </label>
          <div className="relative min-h-[45px] max-w-[120px] border border-border rounded-md overflow-hidden">
            <iframe
              ref={cvvFrameRef}
              id="CardComCvv"
              name="CardComCvv"
              src="https://secure.cardcom.solutions/api/openfields/CVV"
              style={{ width: '100%', height: '45px', border: 'none' }}
              title="CVV"
              onLoad={() => setCvvFrameLoaded(true)}
            />
          </div>
        </div>
        
        {/* reCAPTCHA container */}
        <div id="reCaptchaContainer" className="flex justify-center my-4">
          {/* reCAPTCHA will appear here once initialized */}
        </div>
        
        {/* Google Pay Button (optional) */}
        <div className="flex justify-center">
          <iframe
            ref={googlePayFrameRef}
            id="CardComGooglePay"
            name="CardComGooglePay"
            src={`https://secure.cardcom.solutions/api/openfields/GooglePay?terminalNumber=${cardcomCredentials?.terminalNumber || ''}`}
            style={{ maxWidth: '250px', height: '60px', border: 'none', overflow: 'hidden', display: 'none' }} 
            title="Google Pay"
          />
        </div>

        <Button 
          type="submit" 
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={isLoading || !masterFrameLoaded || processing3DS}
        >
          {planId === 'monthly' ? 'התחל תקופת ניסיון' : 'אשר תשלום'}
        </Button>
        
        {/* Credits frame for Cardcom compliance */}
        <div className="mt-4">
          <iframe
            ref={creditsFrameRef}
            id="CardcomCredits"
            name="CardcomCredits"
            src="https://secure.cardcom.solutions/api/openfields/credits?language=he&type=short"
            style={{ width: '100%', height: '30px', border: 'none' }}
            title="Cardcom Credits"
          />
        </div>
      </form>
    </div>
  );
};

export default CardcomOpenFields;
