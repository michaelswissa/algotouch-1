import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getSubscriptionPlans } from './utils/paymentHelpers';

// Iframe states
enum IframeStatus {
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error',
  SUBMITTING = 'submitting'
}

interface CardcomOpenFieldsProps {
  planId: string;
  onPaymentComplete?: (transactionId: string) => void;
  onError?: (error: string) => void;
  onPaymentStart?: () => void;
  onCancel?: () => void;
}

const CardcomOpenFields: React.FC<CardcomOpenFieldsProps> = ({
  planId,
  onPaymentComplete,
  onPaymentStart,
  onError,
  onCancel
}) => {
  const { user } = useAuth();
  const { fullName, email } = useSubscriptionContext();

  // Iframe references
  const masterFrameRef = useRef<HTMLIFrameElement>(null);
  const cardNumberFrameRef = useRef<HTMLIFrameElement>(null);
  const cvvFrameRef = useRef<HTMLIFrameElement>(null);
  
  // Component state
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [cardOwnerName, setCardOwnerName] = useState('');
  const [status, setStatus] = useState<IframeStatus>(IframeStatus.LOADING);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [lowProfileId, setLowProfileId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);

  // Get registration data
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('registration_data');
      if (storedData) {
        setRegistrationData(JSON.parse(storedData));
      }
    } catch (err) {
      console.error('Error parsing registration data:', err);
    }
  }, []);

  // Initialize cardOwnerName from fullName if available
  useEffect(() => {
    if (fullName && !cardOwnerName) {
      setCardOwnerName(fullName);
    } else if (registrationData?.userData?.firstName && registrationData?.userData?.lastName && !cardOwnerName) {
      setCardOwnerName(`${registrationData.userData.firstName} ${registrationData.userData.lastName}`);
    }
  }, [fullName, cardOwnerName, registrationData]);

  // Get subscription plans data
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  // Initialize iframe communication
  useEffect(() => {
    const setupIframes = async () => {
      try {
        setStatus(IframeStatus.LOADING);
        
        if (!masterFrameRef.current || !cardNumberFrameRef.current || !cvvFrameRef.current) return;
        
        // Load iframe resources
        masterFrameRef.current.src = "https://secure.cardcom.solutions/api/openfields/master";
        cardNumberFrameRef.current.src = "https://secure.cardcom.solutions/api/openfields/cardNumber";
        cvvFrameRef.current.src = "https://secure.cardcom.solutions/api/openfields/CVV";
        
        // Set up post message event listener for iframe communication
        const handleMessage = (event: MessageEvent) => {
          if (event.origin !== 'https://secure.cardcom.solutions') return;
          
          try {
            const data = JSON.parse(event.data);
            console.log('Message from Cardcom:', data);
            
            if (data.status === 'ready') {
              setStatus(IframeStatus.READY);
            } else if (data.status === 'error') {
              setStatus(IframeStatus.ERROR);
              setError(data.message || 'אירעה שגיאה בטעינת טופס התשלום');
              onError?.(data.message || 'אירעה שגיאה בטעינת טופס התשלום');
            }
          } catch (err) {
            console.error('Error processing message:', err, event.data);
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        // Initialize payment session with the server
        await initializePayment();
        
        return () => {
          window.removeEventListener('message', handleMessage);
        };
      } catch (error) {
        console.error('Error setting up iframes:', error);
        setStatus(IframeStatus.ERROR);
        setError('אירעה שגיאה בטעינת טופס התשלום');
        onError?.('אירעה שגיאה בטעינת טופס התשלום');
      }
    };
    
    setupIframes();
  }, [planId]);
  
  // Initialize a payment session with our backend
  const initializePayment = async () => {
    try {
      // Get plan amount
      const amount = plan.price; // This should be in ILS
      
      // Prepare user data
      const userData = {
        planId,
        planName: plan.name,
        amount,
        userId: user?.id,
        userName: cardOwnerName || fullName || '',
        email: email || registrationData?.email || '',
        userEmail: email || registrationData?.email || '',
        isRecurring: planId !== 'vip',
        freeTrialDays: plan.freeTrialDays || 0,
        registrationData
      };
      
      // Call our backend to initialize the payment
      const { data, error } = await supabase.functions.invoke('cardcom-openfields', {
        body: userData
      });
      
      if (error) {
        throw new Error(`Error initializing payment: ${error.message}`);
      }
      
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to initialize payment');
      }
      
      // Store the session ID for reference
      localStorage.setItem('payment_pending_id', data.lowProfileId);
      localStorage.setItem('payment_pending_plan', planId);
      localStorage.setItem('payment_session_created', new Date().toISOString());
      
      // Store URL for iframe redirection if needed
      setPaymentUrl(data.url);
      setLowProfileId(data.lowProfileId);
      
      console.log('Payment session initialized:', {
        lowProfileId: data.lowProfileId,
        url: data.url
      });
      
    } catch (error) {
      console.error('Payment initialization error:', error);
      setStatus(IframeStatus.ERROR);
      setError(error instanceof Error ? error.message : 'אירעה שגיאה באתחול התשלום');
      onError?.(error instanceof Error ? error.message : 'אירעה שגיאה באתחול התשלום');
    }
  };
  
  // Handle form submission
  const handleSubmitPayment = async () => {
    if (status !== IframeStatus.READY || processing || !masterFrameRef.current || !lowProfileId) {
      return;
    }
    
    try {
      setProcessing(true);
      setStatus(IframeStatus.SUBMITTING);
      
      if (onPaymentStart) {
        onPaymentStart();
      }
      
      // Validate required fields
      if (!cardOwnerName || !expirationMonth || !expirationYear) {
        throw new Error('נא למלא את כל פרטי התשלום');
      }
      
      // Format data for Cardcom
      const cardformData = {
        cardOwnerName,
        expirationMonth,
        expirationYear,
        lowProfileId
      };
      
      // Trigger the iframe to submit card data
      masterFrameRef.current.contentWindow?.postMessage(
        JSON.stringify({
          action: 'submitCardData',
          data: cardformData
        }),
        'https://secure.cardcom.solutions'
      );
      
      // Set up a listener for the response
      const paymentResultListener = (event: MessageEvent) => {
        if (event.origin !== 'https://secure.cardcom.solutions') return;
        
        try {
          const data = JSON.parse(event.data);
          console.log('Payment result:', data);
          
          // Remove the listener once we get a response
          window.removeEventListener('message', paymentResultListener);
          
          if (data.status === 'success') {
            // Handle successful payment
            toast.success('התשלום התקבל בהצלחה!');
            setProcessing(false);
            
            // Clean up session data
            localStorage.removeItem('payment_pending_id');
            localStorage.removeItem('payment_pending_plan');
            localStorage.removeItem('payment_session_created');
            
            // Notify parent component
            onPaymentComplete?.(data.transactionId || lowProfileId);
          } else {
            // Handle payment failure
            setError(data.message || 'אירעה שגיאה בתהליך התשלום');
            setStatus(IframeStatus.ERROR);
            setProcessing(false);
            onError?.(data.message || 'אירעה שגיאה בתהליך התשלום');
          }
        } catch (err) {
          console.error('Error processing payment result:', err);
          setError('אירעה שגיאה בעיבוד תוצאת התשלום');
          setStatus(IframeStatus.ERROR);
          setProcessing(false);
          onError?.('אירעה שגיאה בעיבוד תוצאת התשלום');
        }
      };
      
      window.addEventListener('message', paymentResultListener);
      
      // Set a timeout to remove the listener if no response is received
      setTimeout(() => {
        window.removeEventListener('message', paymentResultListener);
        if (processing) {
          setStatus(IframeStatus.ERROR);
          setProcessing(false);
          setError('לא התקבלה תשובה מחברת הסליקה. נסה שוב מאוחר יותר');
          onError?.('לא התקבלה תשובה מחברת הסליקה. נסה שוב מאוחר יותר');
        }
      }, 60000); // 60 second timeout
      
    } catch (error) {
      console.error('Payment submission error:', error);
      setError(error instanceof Error ? error.message : 'אירעה שגיאה בתהליך התשלום');
      setStatus(IframeStatus.ERROR);
      setProcessing(false);
      onError?.(error instanceof Error ? error.message : 'אירעה שגיאה בתהליך התשלום');
    }
  };
  
  // Handle direct form data changes
  const handleExpirationMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 2);
    if (value && parseInt(value) > 12) {
      setExpirationMonth('12');
    } else if (value && parseInt(value) < 1) {
      setExpirationMonth('01');
    } else {
      setExpirationMonth(value.padStart(2, '0'));
    }
  };
  
  const handleExpirationYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 2);
    const currentYear = new Date().getFullYear() % 100;
    
    if (value && parseInt(value) < currentYear) {
      setExpirationYear(currentYear.toString());
    } else {
      setExpirationYear(value);
    }
  };
  
  // If there's a direct payment URL, we could use it for redirection
  useEffect(() => {
    if (paymentUrl && !window.location.search.includes('lowProfileId') && status === IframeStatus.ERROR) {
      console.log('Fallback to direct payment URL:', paymentUrl);
      // Could implement fallback to redirect flow here
    }
  }, [paymentUrl, status]);
  
  return (
    <div className="space-y-6" dir="rtl">
      {/* Hidden iframes for Cardcom OpenFields */}
      <iframe 
        ref={masterFrameRef}
        id="CardComMasterFrame" 
        name="CardComMasterFrame" 
        src="about:blank"
        title="Cardcom Master Frame"
        style={{ display: 'none', width: '0px', height: '0px' }}
      ></iframe>
      
      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      
      {/* Payment form */}
      <div className="space-y-4">
        {/* Card Owner Name */}
        <div className="space-y-2">
          <label htmlFor="cardOwnerName" className="block text-sm font-medium text-gray-700">
            שם בעל הכרטיס
          </label>
          <input
            id="cardOwnerName"
            name="cardOwnerName"
            type="text"
            value={cardOwnerName}
            onChange={(e) => setCardOwnerName(e.target.value)}
            placeholder="שם בעל הכרטיס"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
            disabled={processing}
          />
        </div>
        
        {/* Card Number - Iframe */}
        <div className="space-y-2">
          <label htmlFor="CardComCardNumber" className="block text-sm font-medium text-gray-700">
            מספר כרטיס
          </label>
          <div className="relative" style={{ height: '42px' }}>
            <iframe 
              ref={cardNumberFrameRef}
              id="CardComCardNumber" 
              name="CardComCardNumber"
              src="about:blank"
              title="Card Number Input"
              style={{ width: '100%', height: '100%', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
            ></iframe>
            
            {/* Loading overlay */}
            {status === IframeStatus.LOADING && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 rounded-md">
                <div className="h-5 w-5 border-2 border-t-primary animate-spin rounded-full"></div>
              </div>
            )}
          </div>
        </div>
        
        {/* Card Expiration and CVV */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label htmlFor="expirationMonth" className="block text-sm font-medium text-gray-700">
              חודש תפוגה
            </label>
            <input
              id="expirationMonth"
              name="expirationMonth"
              type="text"
              value={expirationMonth}
              onChange={handleExpirationMonthChange}
              placeholder="MM"
              maxLength={2}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
              disabled={processing}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="expirationYear" className="block text-sm font-medium text-gray-700">
              שנת תפוגה
            </label>
            <input
              id="expirationYear"
              name="expirationYear"
              type="text"
              value={expirationYear}
              onChange={handleExpirationYearChange}
              placeholder="YY"
              maxLength={2}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
              disabled={processing}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="CardComCvv" className="block text-sm font-medium text-gray-700">
              קוד אבטחה (CVV)
            </label>
            <div className="relative" style={{ height: '42px' }}>
              <iframe 
                ref={cvvFrameRef}
                id="CardComCvv" 
                name="CardComCvv"
                src="about:blank"
                title="CVV Input"
                style={{ width: '100%', height: '100%', border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
              ></iframe>
              
              {/* Loading overlay */}
              {status === IframeStatus.LOADING && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 rounded-md">
                  <div className="h-5 w-5 border-2 border-t-primary animate-spin rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Total amount */}
        <div className="py-4 border-t border-gray-200 mt-4">
          <div className="flex justify-between">
            <span className="font-semibold">סך הכל לתשלום:</span>
            <span className="font-bold">{plan.price} ₪</span>
          </div>
          {planId !== 'vip' && plan.hasTrial && (plan.freeTrialDays || 0) > 0 && (
            <div className="text-sm text-green-600 mt-2">
              * החיוב הראשון יהיה לאחר {plan.freeTrialDays} ימי ניסיון בחינם
            </div>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={processing}
          >
            ביטול
          </Button>
          
          <Button
            type="button"
            onClick={handleSubmitPayment}
            disabled={status !== IframeStatus.READY || processing}
            className="sm:mr-2"
          >
            {processing ? (
              <>
                <span className="h-5 w-5 border-2 border-t-background animate-spin rounded-full mr-2"></span>
                מעבד תשלום...
              </>
            ) : planId !== 'vip' && plan.hasTrial && (plan.freeTrialDays || 0) > 0 ? (
              'התחל תקופת ניסיון'
            ) : (
              'אישור תשלום'
            )}
          </Button>
        </div>
        
        {/* Security message */}
        <div className="text-xs text-center text-gray-500 mt-4">
          <p>תשלום מאובטח באמצעות אישורית זהב | כל הפרטים מוצפנים ומוגנים</p>
        </div>
        
        {/* Cardcom credits */}
        <div className="flex justify-center">
          <iframe
            id="CardcomCredits"
            name="CardcomCredits"
            src="https://secure.cardcom.solutions/api/openfields/credits?language=he&type=short"
            title="Cardcom Credits"
            style={{ width: '100%', height: '20px', border: 'none' }}
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default CardcomOpenFields;
