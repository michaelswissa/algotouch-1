import React, { useState, useCallback, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import CardNumberFrame from './iframes/CardNumberFrame';
import CVVFrame from './iframes/CVVFrame';
import ReCaptchaFrame from './iframes/ReCaptchaFrame';
import CardExpiryInputs from './CardExpiryInputs';
import SecurityNote from './SecurityNote';
import { usePaymentValidation } from '@/hooks/payment/usePaymentValidation';

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
  const [cardholderName, setCardholderName] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [frameLoadAttempts, setFrameLoadAttempts] = useState(0);

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

  const handleIframeLoad = useCallback(() => {
    setFrameLoadAttempts(prev => prev + 1);
    console.log('Frame loaded, attempt:', frameLoadAttempts + 1);
  }, [frameLoadAttempts]);

  useEffect(() => {
    const masterFrame = masterFrameRef.current;
    if (masterFrame) {
      masterFrame.onload = () => {
        console.log('Master frame loaded');
        setFrameLoadAttempts(prev => prev + 1);
      };
    }
  }, [masterFrameRef]);

  useEffect(() => {
    if (masterFrameRef.current?.contentWindow && frameLoadAttempts > 0) {
      const data = {
        action: 'setCardOwnerDetails',
        data: {
          cardOwnerName: cardholderName,
          cardOwnerEmail: email,
          cardOwnerPhone: phone,
          expirationMonth: expiryMonth,
          expirationYear: expiryYear
        }
      };
      
      masterFrameRef.current.contentWindow.postMessage(data, '*');
    }
  }, [cardholderName, email, phone, expiryMonth, expiryYear, frameLoadAttempts, masterFrameRef]);

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
          required
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
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="CardComCardNumber">מספר כרטיס</Label>
        <div className="relative">
          {frameLoadAttempts > 0 && (
            <CardNumberFrame
              terminalNumber={terminalNumber}
              cardcomUrl={cardcomUrl}
              onLoad={handleIframeLoad}
              frameLoadAttempts={frameLoadAttempts}
            />
          )}
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
          {frameLoadAttempts > 0 && (
            <CVVFrame
              terminalNumber={terminalNumber}
              cardcomUrl={cardcomUrl}
              onLoad={handleIframeLoad}
              frameLoadAttempts={frameLoadAttempts}
            />
          )}
          {cvvError && (
            <p className="text-sm text-red-500">{cvvError}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <ReCaptchaFrame
          terminalNumber={terminalNumber}
          cardcomUrl={cardcomUrl}
          onLoad={() => {}}
        />
      </div>

      <SecurityNote />
    </div>
  );
};

export default PaymentDetails;
