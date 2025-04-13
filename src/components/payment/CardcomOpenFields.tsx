
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
}

const CardcomOpenFields: React.FC<CardcomOpenFieldsProps> = ({
  planId,
  amount,
  onPaymentComplete,
  onError,
  onPaymentStart
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Create refs for the iframe and the payment session
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const paymentInitialized = useRef(false);

  // Function to handle messages from the CardCom iframe
  const handleIframeMessages = (event: MessageEvent) => {
    // Validate the origin for security (only accept messages from CardCom)
    if (event.origin !== 'https://secure.cardcom.solutions') {
      return;
    }

    console.info('Message from iframe:', event.data);

    try {
      const message = event.data;

      // Handle validation messages
      if (message.action === 'handleValidations') {
        console.log(`Field ${message.field} validation:`, message.isValid);
      } 
      // Handle errors from the iframe
      else if (message.action === 'HandleEror') {
        console.error('CardCom error:', message);
        setIsLoading(false);
        
        if (message.message && message.message.includes('העסקה כבר הושלמה')) {
          // Handle the case where the transaction was already completed
          toast.error('שגיאה: העסקה כבר הושלמה, אנא רענן את הדף ונסה שנית');
          
          // Clean up the session on this error
          if (sessionId) {
            cleanupPaymentSession(sessionId);
          }
          
          if (onError) onError('העסקה כבר הושלמה, אנא רענן את הדף ונסה שנית');
          return;
        }
        
        setError(message.message || 'שגיאה בתהליך התשלום');
        if (onError) onError(message.message || 'שגיאה בתהליך התשלום');
      } 
      // Handle successful payment from the iframe
      else if (message.action === 'HandleSubmit') {
        console.log('Payment successful:', message.data);
        
        if (message.data && message.data.IsSuccess) {
          // Process the successful payment
          setIsLoading(false);
          
          // Clean up the session on success
          if (sessionId) {
            cleanupPaymentSession(sessionId);
          }
          
          // Call the onPaymentComplete callback if provided
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
      setError('שגיאה בתהליך התשלום');
      if (onError) onError('שגיאה בעיבוד תשובת התשלום');
    }
  };

  // Clean up payment session
  const cleanupPaymentSession = async (sid: string) => {
    try {
      await supabase
        .from('payment_sessions')
        .update({ 
          expires_at: new Date().toISOString(),  // Expire the session immediately
          payment_details: { status: 'completed' } // Fix: Don't spread sessionId which is a string
        })
        .eq('id', sid);
    } catch (err) {
      console.error('Error cleaning up payment session:', err);
    }
  };

  // Initialize the Cardcom iframe
  const initializeCardcom = async () => {
    if (paymentInitialized.current) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if there's an existing active payment session for this user and plan
      if (user?.id) {
        const { data: existingSessions } = await supabase
          .from('payment_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('plan_id', planId)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });
          
        // If there are existing sessions, clean them up
        if (existingSessions && existingSessions.length > 0) {
          console.log('Found existing payment sessions, cleaning up...');
          for (const session of existingSessions) {
            await cleanupPaymentSession(session.id);
          }
        }
      }
      
      // Start a new payment session with Cardcom
      let planAmount = amount;
      if (!planAmount) {
        // Determine amount based on plan if not provided
        switch (planId) {
          case 'monthly':
            planAmount = 0; // Free trial
            break;
          case 'annual':
            planAmount = 3371; // Annual price in ILS
            break;
          case 'vip':
            planAmount = 13121; // VIP price in ILS
            break;
          default:
            planAmount = 0;
        }
      }
      
      // Get user details for the payment
      const userName = user?.user_metadata?.name || '';
      const userEmail = user?.email || '';
      
      // Get the plan name for display
      let planName = '';
      switch (planId) {
        case 'monthly':
          planName = 'מנוי חודשי - חודש ניסיון חינם';
          break;
        case 'annual':
          planName = 'מנוי שנתי';
          break;
        case 'vip':
          planName = 'מנוי VIP - לכל החיים';
          break;
        default:
          planName = 'מנוי';
      }

      // Create payment session using the edge function
      const { data, error: sessionError } = await supabase.functions.invoke('cardcom-openfields', {
        body: {
          planId,
          planName,
          amount: planAmount,
          userEmail,
          userName,
          userId: user?.id || null,
          isRecurring: planId === 'monthly' || planId === 'annual',
          freeTrialDays: planId === 'monthly' ? 30 : 0
        }
      });
      
      if (sessionError) {
        throw new Error(sessionError.message);
      }
      
      if (!data || !data.lowProfileId) {
        throw new Error('No payment session created');
      }
      
      console.log('Payment session created:', data);
      setSessionId(data.lowProfileId);
      
      // Wait for iframe to be loaded
      setTimeout(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          // Add required CSS for the CardCom fields
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
            .cardNumberField::placeholder {
              color: #a0aec0;
            }
          `;
          
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
            .cvvField::placeholder {
              color: #a0aec0;
            }
          `;

          // Add captcha CSS styles
          const captchaCss = `
            .captchaField {
              width: 100%;
              max-width: 300px;
              margin: 0 auto;
              display: block;
            }
          `;

          // Initialize the iframe with our configuration
          iframeRef.current.contentWindow.postMessage({
            action: 'init',
            lowProfileCode: data.lowProfileId,
            cardFieldCSS: cardCss,
            cvvFieldCSS: cvvCss,
            captchaFieldCSS: captchaCss,
            language: 'he',
            placeholder: '0000-0000-0000-0000',
            cvvPlaceholder: '***',
            use3DS: true, // Enable 3DS
            useReCaptcha: true, // Enable Google reCAPTCHA
            showFieldLabels: true
          }, 'https://secure.cardcom.solutions');
          
          setIframeLoaded(true);
          paymentInitialized.current = true;
        }
      }, 1000);
      
    } catch (err) {
      console.error('Error initializing Cardcom:', err);
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת תהליך התשלום');
      if (onError) onError(err instanceof Error ? err.message : 'שגיאה ביצירת תהליך התשלום');
    } finally {
      setIsLoading(false);
    }
  };

  // Set up message listeners when the component mounts
  useEffect(() => {
    window.addEventListener('message', handleIframeMessages);
    
    // Load the CardCom iframe script
    const cardcomScript = document.createElement('script');
    cardcomScript.src = `https://secure.cardcom.solutions/External/OpenFields/3DS.js?v=${new Date().getTime()}`;
    document.head.appendChild(cardcomScript);
    
    // Initialize after script is loaded
    cardcomScript.onload = () => {
      initializeCardcom();
    };
    
    // Clean up event listeners and references when the component unmounts
    return () => {
      window.removeEventListener('message', handleIframeMessages);
      paymentInitialized.current = false;
      
      // Clean up the session if component unmounts without completing
      if (sessionId) {
        cleanupPaymentSession(sessionId);
      }
      
      // Remove the script
      if (document.head.contains(cardcomScript)) {
        document.head.removeChild(cardcomScript);
      }
    };
  }, []);

  // Function to handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading || !iframeLoaded) {
      return;
    }
    
    setIsLoading(true);
    if (onPaymentStart) onPaymentStart();
    
    // Get card details from the form
    const expirationMonth = (document.getElementById('expirationMonth') as HTMLInputElement)?.value;
    const expirationYear = (document.getElementById('expirationYear') as HTMLInputElement)?.value;
    const cardOwnerName = (document.getElementById('cardOwnerName') as HTMLInputElement)?.value;
    const cardOwnerID = (document.getElementById('cardOwnerID') as HTMLInputElement)?.value || '000000000';
    
    if (!cardOwnerName || !expirationMonth || !expirationYear) {
      setIsLoading(false);
      setError('נא למלא את כל השדות הנדרשים');
      if (onError) onError('נא למלא את כל השדות הנדרשים');
      return;
    }
    
    // Validate expiration date
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear() % 100;
    const expMonth = parseInt(expirationMonth);
    const expYear = parseInt(expirationYear);
    
    if (isNaN(expMonth) || isNaN(expYear) || expMonth < 1 || expMonth > 12) {
      setIsLoading(false);
      setError('תאריך תפוגה אינו תקין');
      if (onError) onError('תאריך תפוגה אינו תקין');
      return;
    }
    
    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      setIsLoading(false);
      setError('כרטיס האשראי פג תוקף');
      if (onError) onError('כרטיס האשראי פג תוקף');
      return;
    }
    
    // Process the payment through the iframe
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        // Set card owner details for the transaction
        iframeRef.current.contentWindow.postMessage({
          action: 'setCardOwnerDetails',
          data: {
            cardOwnerName,
            cardOwnerEmail: user?.email || '',
            cardOwnerPhone: ''
          }
        }, 'https://secure.cardcom.solutions');
        
        // Submit the transaction with 3DS enabled
        iframeRef.current.contentWindow.postMessage({
          action: 'doTransaction',
          cardOwnerId: cardOwnerID,
          cardOwnerName: cardOwnerName,
          cardOwnerEmail: user?.email || '',
          expirationMonth,
          expirationYear,
          cardOwnerPhone: '',
          numberOfPayments: planId === 'monthly' ? "1" : planId === 'annual' ? "1" : "1",
          use3DS: true // Ensure 3DS is enabled for the transaction
        }, 'https://secure.cardcom.solutions');
      }
    } catch (err) {
      console.error('Error submitting payment:', err);
      setIsLoading(false);
      setError('שגיאה בשליחת התשלום');
      if (onError) onError('שגיאה בשליחת התשלום');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit} id="payment-form" className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
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

          {/* Card Number - Will be replaced by CardCom iframe */}
          <div>
            <label htmlFor="CardComCardNumber" className="block text-sm font-medium mb-1">
              מספר כרטיס
            </label>
            <div className="payment-field-container relative">
              <iframe
                ref={iframeRef}
                id="CardComMasterFrame"
                src="https://secure.cardcom.solutions/External/lowProfileClearing/OpenFieldsFrame.html"
                style={{ width: '100%', height: '300px', border: 'none', overflow: 'hidden' }}
                title="CardCom Payment Form"
              />
              {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <div className="h-8 w-8 rounded-full border-2 border-t-primary animate-spin" />
                </div>
              )}
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
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || !iframeLoaded}
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 mr-2 rounded-full border-2 border-t-white animate-spin" />
              מעבד תשלום...
            </>
          ) : (
            planId === 'monthly' ? 'התחל תקופת ניסיון' : 'אשר תשלום'
          )}
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          התשלום מאובטח ומוצפן באמצעות Cardcom
        </p>
      </form>
    </div>
  );
};

export default CardcomOpenFields;
