
import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import CardNumberFrame from './iframes/CardNumberFrame';
import CVVFrame from './iframes/CVVFrame';
import ReCaptchaFrame from './iframes/ReCaptchaFrame';
import CardExpiryInputs from './CardExpiryInputs';
import SecurityNote from './SecurityNote';
import { usePaymentValidation } from '@/hooks/payment/usePaymentValidation';
import { Loader2 } from 'lucide-react';

interface PaymentDetailsProps {
  terminalNumber: string;
  cardcomUrl: string;
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
}

const PaymentDetails: React.FC<PaymentDetailsProps> = ({ 
  terminalNumber, 
  cardcomUrl,
  masterFrameRef 
}) => {
  const [cardNumberFrameLoaded, setCardNumberFrameLoaded] = useState(false);
  const [cvvFrameLoaded, setCvvFrameLoaded] = useState(false);
  const [recaptchaFrameLoaded, setRecaptchaFrameLoaded] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [frameLoadAttempts, setFrameLoadAttempts] = useState(0);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const {
    cardNumberError,
    cardTypeInfo,
    cvvError,
    cardholderNameError,
    expiryError,
    isValid,
    validateCardNumber,
    validateCvv
  } = usePaymentValidation({
    cardholderName,
    expiryMonth,
    expiryYear
  });

  // Reset frames when terminal number changes
  useEffect(() => {
    if (terminalNumber) {
      setCardNumberFrameLoaded(false);
      setCvvFrameLoaded(false);
      setRecaptchaFrameLoaded(false);
      setFrameLoadAttempts(prev => prev + 1);
      console.log(`Frames reset for terminal ${terminalNumber}`);
    }
  }, [terminalNumber]);

  // Retry loading frames if they fail
  useEffect(() => {
    if (!cardNumberFrameLoaded || !cvvFrameLoaded) {
      const maxAttempts = 5;
      if (frameLoadAttempts < maxAttempts && terminalNumber) {
        const timer = setTimeout(() => {
          console.log(`Retrying frame load, attempt ${frameLoadAttempts + 1}`);
          setFrameLoadAttempts(prev => prev + 1);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [cardNumberFrameLoaded, cvvFrameLoaded, frameLoadAttempts, terminalNumber]);

  // Update card owner details in the master frame when they change
  useEffect(() => {
    if (masterFrameRef.current?.contentWindow) {
      const data = {
        cardOwnerName: cardholderName,
        cardOwnerEmail: email,
        cardOwnerPhone: phone,
        expirationMonth: expiryMonth,
        expirationYear: expiryYear
      };
      
      console.log('Updating card owner details:', data);
      
      masterFrameRef.current.contentWindow.postMessage({ 
        action: 'setCardOwnerDetails', 
        data 
      }, '*');
    }
  }, [cardholderName, email, phone, expiryMonth, expiryYear, masterFrameRef]);

  const handleCardNumberFrameLoaded = () => {
    console.log('Card number frame loaded');
    setCardNumberFrameLoaded(true);
  };

  const handleCvvFrameLoaded = () => {
    console.log('CVV frame loaded');
    setCvvFrameLoaded(true);
  };

  const handleRecaptchaFrameLoaded = () => {
    console.log('reCAPTCHA frame loaded');
    setRecaptchaFrameLoaded(true);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label htmlFor="cardOwnerName">שם בעל הכרטיס</Label>
        <Input
          id="cardOwnerName"
          name="cardOwnerName"
          placeholder="ישראל ישראלי"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          className={cardholderNameError ? 'border-red-500' : ''}
          required
        />
        {cardholderNameError && (
          <p className="text-sm text-red-500">{cardholderNameError}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cardOwnerEmail">דוא"ל</Label>
        <Input
          id="cardOwnerEmail"
          name="cardOwnerEmail"
          type="email"
          placeholder="example@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cardOwnerPhone">טלפון</Label>
        <Input
          id="cardOwnerPhone"
          name="cardOwnerPhone"
          placeholder="05xxxxxxxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="CardComCardNumber">מספר כרטיס</Label>
        <div className="relative">
          {!cardNumberFrameLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded border border-input">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          <CardNumberFrame
            terminalNumber={terminalNumber}
            cardcomUrl={cardcomUrl}
            onLoad={handleCardNumberFrameLoaded}
            frameLoadAttempts={frameLoadAttempts}
          />
          {cardNumberError && (
            <p className="text-sm text-red-500">{cardNumberError}</p>
          )}
          {cardTypeInfo && (
            <p className="text-sm text-muted-foreground">
              סוג כרטיס: {cardTypeInfo}
            </p>
          )}
        </div>
      </div>

      <CardExpiryInputs
        expiryMonth={expiryMonth}
        expiryYear={expiryYear}
        onMonthChange={setExpiryMonth}
        onYearChange={setExpiryYear}
        error={expiryError}
      />

      <div className="space-y-2">
        <Label htmlFor="CardComCvv">קוד אבטחה (CVV)</Label>
        <div className="relative">
          {!cvvFrameLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded border border-input">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          <CVVFrame
            terminalNumber={terminalNumber}
            cardcomUrl={cardcomUrl}
            onLoad={handleCvvFrameLoaded}
            frameLoadAttempts={frameLoadAttempts}
          />
          {cvvError && (
            <p className="text-sm text-red-500">{cvvError}</p>
          )}
        </div>
      </div>

      {/* Add reCAPTCHA component */}
      <div className="space-y-2">
        <div className="relative">
          {!recaptchaFrameLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          <ReCaptchaFrame
            terminalNumber={terminalNumber}
            cardcomUrl={cardcomUrl}
            onLoad={handleRecaptchaFrameLoaded}
          />
        </div>
      </div>

      <SecurityNote />
    </div>
  );
};

export default PaymentDetails;
