
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

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
  const masterFrameRef = useRef<HTMLIFrameElement | null>(null);
  const cardNumberFrameRef = useRef<HTMLIFrameElement | null>(null);
  const cvvFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [cardOwnerName, setCardOwnerName] = useState('');
  const [cardOwnerEmail, setCardOwnerEmail] = useState('');
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Check for registration data in session storage on component mount
  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        setRegistrationData(parsedData);
        if (parsedData.userData?.firstName && parsedData.userData?.lastName) {
          setCardOwnerName(`${parsedData.userData.firstName} ${parsedData.userData.lastName}`);
        }
        if (parsedData.email) {
          setCardOwnerEmail(parsedData.email);
        }
      } catch (error) {
        console.error('Error parsing registration data:', error);
      }
    } else if (user) {
      // Use data from authenticated user
      if (user.user_metadata?.first_name && user.user_metadata?.last_name) {
        setCardOwnerName(`${user.user_metadata.first_name} ${user.user_metadata.last_name}`);
      }
      if (user.email) {
        setCardOwnerEmail(user.email);
      }
    }
  }, [user]);

  // Initialize Cardcom OpenFields
  useEffect(() => {
    const initializeCardcomOpenFields = async () => {
      setIsLoading(true);

      try {
        // Load Cardcom 3DS script
        const cardcom3DSScript = document.createElement('script');
        const time = new Date().getTime();
        cardcom3DSScript.setAttribute('src', 'https://secure.cardcom.solutions/External/OpenFields/3DS.js?v=' + time);
        document.head.appendChild(cardcom3DSScript);

        // Determine if we're in registration flow or normal authenticated flow
        const isRegistration = Boolean(registrationData && !user);
        
        // Get user details - either from authenticated user or registration data
        const userEmail = cardOwnerEmail || user?.email || registrationData?.email || '';
        const userName = cardOwnerName || (user?.user_metadata?.first_name 
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
          : (registrationData?.userData?.firstName 
            ? `${registrationData.userData.firstName} ${registrationData.userData.lastName || ''}`
            : ''));

        console.log('Initializing Cardcom OpenFields with:', { 
          isRegistration, 
          planId, 
          userName,
          userEmail: userEmail ? userEmail.substring(0, 3) + '...' : 'none',
        });

        // Call the edge function to get payment configuration
        const { data, error } = await supabase.functions.invoke('cardcom-openfields', {
          body: {
            planId,
            planName,
            amount,
            userEmail,
            userName,
            isRegistration,
            registrationData: isRegistration ? registrationData : null
          }
        });

        if (error) {
          console.error('Error initializing Cardcom OpenFields:', error);
          onError('שגיאה בהתחברות למערכת התשלומים: ' + error.message);
          return;
        }

        console.log('Successfully got Cardcom payment config');
        setPaymentConfig(data);

        // Once loaded, set up the iframes
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);

      } catch (error: any) {
        console.error('Error initializing Cardcom OpenFields:', error);
        onError(`שגיאה בהתחברות למערכת התשלומים: ${error.message}`);
      }
    };

    initializeCardcomOpenFields();
  }, [planId, planName, amount, user, registrationData, onError, retryCount]);

  // Set up iframes once payment config is loaded
  useEffect(() => {
    if (isLoading || !paymentConfig) return;

    // Set up iframe sources
    if (masterFrameRef.current) {
      masterFrameRef.current.src = "https://secure.cardcom.solutions/api/openfields/master";
    }
    
    if (cardNumberFrameRef.current) {
      cardNumberFrameRef.current.src = "https://secure.cardcom.solutions/api/openfields/cardNumber";
    }
    
    if (cvvFrameRef.current) {
      cvvFrameRef.current.src = "https://secure.cardcom.solutions/api/openfields/CVV";
    }

  }, [isLoading, paymentConfig]);

  // Set up message listener for iframe communication
  useEffect(() => {
    if (isLoading || !paymentConfig) return;
    
    const handleMessage = (event: MessageEvent) => {
      // Verify message source
      if (!event.origin.includes('cardcom.solutions')) {
        return;
      }

      const message = event.data;
      console.log('Received message from Cardcom:', message);

      if (message.action === 'HandleSubmit') {
        console.log('Payment success:', message.data);
        setIsProcessing(false);
        
        if (message.data?.IsSuccess) {
          const transactionId = message.data.InternalDealNumber || 'unknown';
          onSuccess(transactionId);
        } else {
          onError(message.data?.Description || 'שגיאה בביצוע התשלום');
        }
      } else if (message.action === 'HandleEror') {
        console.error('Payment error:', message);
        setIsProcessing(false);
        onError(message.message || 'שגיאה בביצוע התשלום');
      } else if (message.action === 'handleValidations') {
        // Handle field validations if needed
        console.log('Field validation:', message);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isLoading, paymentConfig, onSuccess, onError]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const setCardOwnerDetails = () => {
    if (!masterFrameRef.current || !paymentConfig) return;
    
    // Update card holder details: name, email and phone
    const data = {
      cardOwnerName: cardOwnerName,
      cardOwnerEmail: cardOwnerEmail,
      cardOwnerPhone: '', // Optional phone number
    };

    masterFrameRef.current.contentWindow?.postMessage({ 
      action: 'setCardOwnerDetails', 
      data 
    }, '*');
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterFrameRef.current || !paymentConfig) return;
    
    setIsProcessing(true);
    
    const formProps = {
      action: 'doTransaction',
      cardOwnerId: '000000000', // Israeli ID or zeros for testing
      cardOwnerName: cardOwnerName,
      cardOwnerEmail: cardOwnerEmail,
      expirationMonth: expirationMonth,
      expirationYear: expirationYear,
      cardOwnerPhone: '', // Optional phone number
      numberOfPayments: "1",
      // Add document info if needed for invoice
      document: {
        Name: cardOwnerName,
        Email: cardOwnerEmail,
        IsSendByEmail: true,
        Language: "he"
      }
    };

    masterFrameRef.current.contentWindow?.postMessage({
      ...formProps
    }, '*');
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return month < 10 ? `0${month}` : `${month}`;
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => {
    const year = currentYear + i;
    return year.toString().slice(2); // Get last 2 digits
  });

  // Add custom CSS to iframes
  const addCustomStyles = () => {
    const cardNumberCss = `
      body { margin: 0; }
      #cardNumber {
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
        width: 100%;
        height: 38px;
        padding: 0.5rem;
        font-size: 0.875rem;
        line-height: 1.25rem;
      }
      #cardNumber:focus {
        outline: 2px solid #2563eb;
        border-color: transparent;
      }
    `;

    const cvvCss = `
      body { margin: 0; }
      #cvvField {
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
        height: 38px;
        padding: 0.5rem;
        font-size: 0.875rem;
        line-height: 1.25rem;
        width: 100%;
      }
      #cvvField:focus {
        outline: 2px solid #2563eb;
        border-color: transparent;
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

    if (masterFrameRef.current) {
      masterFrameRef.current.contentWindow?.postMessage({
        action: 'init',
        cardFieldCSS: cardNumberCss,
        cvvFieldCSS: cvvCss,
        placeholder: "0000 0000 0000 0000",
        cvvPlaceholder: "123",
        terminalNumber: paymentConfig?.terminalNumber,
        lowProfileCode: paymentConfig?.lowProfileId,
        language: "he"
      }, '*');
    }
  };

  useEffect(() => {
    if (!isLoading && paymentConfig) {
      // Add a short delay to ensure iframes are loaded
      setTimeout(addCustomStyles, 500);
    }
  }, [isLoading, paymentConfig]);

  // Validate fields
  const validateCardNumber = () => {
    if (!masterFrameRef.current) return;
    masterFrameRef.current.contentWindow?.postMessage({ action: "validateCardNumber" }, '*');
  };

  const validateCvv = () => {
    if (!masterFrameRef.current) return;
    masterFrameRef.current.contentWindow?.postMessage({ action: "validateCvv" }, '*');
  };

  if (!paymentConfig && !isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 mb-4">לא ניתן לטעון את טופס התשלום</div>
        <div className="flex space-x-4 justify-center">
          <Button onClick={handleRetry}>נסה שנית</Button>
          <Button variant="outline" onClick={onCancel}>בחר אמצעי תשלום אחר</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-md overflow-hidden" dir="rtl">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-8 gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <div>טוען את טופס התשלום...</div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold mb-4">פרטי תשלום</h3>
            
            {/* Hidden master iframe */}
            <iframe 
              id="CardComMasterFrame" 
              ref={masterFrameRef}
              style={{display: 'block', width: '0px', height: '0px'}}
              title="Cardcom Master Frame"
            />
            
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              {/* Card Owner Details */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cardOwnerName">שם בעל הכרטיס</Label>
                  <input
                    type="text"
                    id="cardOwnerName"
                    value={cardOwnerName}
                    onChange={(e) => setCardOwnerName(e.target.value)}
                    onBlur={setCardOwnerDetails}
                    className="w-full p-2 border rounded-md"
                    placeholder="ישראל ישראלי"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="cardOwnerEmail">דוא"ל</Label>
                  <input
                    type="email"
                    id="cardOwnerEmail"
                    value={cardOwnerEmail}
                    onChange={(e) => setCardOwnerEmail(e.target.value)}
                    onBlur={setCardOwnerDetails}
                    className="w-full p-2 border rounded-md"
                    placeholder="israel@example.com"
                    required
                  />
                </div>
              </div>
              
              {/* Credit Card Number */}
              <div>
                <Label htmlFor="CardComCardNumber">מספר כרטיס אשראי</Label>
                <iframe 
                  id="CardComCardNumber" 
                  ref={cardNumberFrameRef}
                  style={{width: '100%', height: '40px', border: 'none'}}
                  title="Card Number"
                  onBlur={validateCardNumber}
                />
              </div>
              
              {/* Card Expiration and CVV */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="expirationMonth">חודש</Label>
                  <select
                    id="expirationMonth"
                    value={expirationMonth}
                    onChange={(e) => setExpirationMonth(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">חודש</option>
                    {months.map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="expirationYear">שנה</Label>
                  <select
                    id="expirationYear"
                    value={expirationYear}
                    onChange={(e) => setExpirationYear(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">שנה</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="CardComCvv">CVV</Label>
                  <iframe 
                    id="CardComCvv" 
                    ref={cvvFrameRef}
                    style={{width: '100%', height: '40px', border: 'none'}}
                    title="CVV"
                    onBlur={validateCvv}
                  />
                </div>
              </div>
              
              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    מעבד תשלום...
                  </span>
                ) : planId === 'monthly' ? 'התחל תקופת ניסיון חינם' : 'בצע תשלום'}
              </Button>
              
              <div className="text-xs text-center text-gray-500 mt-2">
                העסקאות מאובטחות ע"י אישורית זהב
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CardcomOpenFields;
