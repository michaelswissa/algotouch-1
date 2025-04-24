
import React, { useState, useCallback, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import CardNumberFrame from './iframes/CardNumberFrame';
import CVVFrame from './iframes/CVVFrame';
import ReCaptchaFrame from './iframes/ReCaptchaFrame';
import CardExpiryInputs from './CardExpiryInputs';
import SecurityNote from './SecurityNote';
import PaymentIframe from './PaymentIframe';
import { usePaymentValidation } from '@/hooks/payment/usePaymentValidation';

interface PaymentDetailsProps {
  terminalNumber: string;
  cardcomUrl: string;
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  isReady?: boolean;
  /** optional – forwarded to the iframe */
  onMasterFrameLoad?: () => void;
}

const PaymentDetails: React.FC<PaymentDetailsProps> = ({ 
  terminalNumber, 
  cardcomUrl,
  masterFrameRef,
  isReady = false,
  onMasterFrameLoad
}) => {
  const [cardholderName, setCardholderName] = useState('');
  const [cardOwnerId, setCardOwnerId] = useState(''); 
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loadedFields, setLoadedFields] = useState(new Set<string>());

  const {
    cardNumberError,
    cardTypeInfo,
    cvvError,
    cardholderNameError,
    expiryError,
    idNumberError,
    isValid,
    validateCardNumber,
    validateCvv,
    validateIdNumber
  } = usePaymentValidation({
    cardholderName,
    cardOwnerId,
    expiryMonth,
    expiryYear
  });

  const handleFieldLoad = useCallback((fieldName: string) => {
    console.log(`Field loaded: ${fieldName}`);
    setLoadedFields(prev => {
      const newFields = new Set(prev);
      newFields.add(fieldName);
      return newFields;
    });
  }, []);

  useEffect(() => {
    if (!isReady || !masterFrameRef.current?.contentWindow) return;

    const data = {
      action: 'setCardOwnerDetails',
      data: {
        cardOwnerName: cardholderName,
        cardOwnerId: cardOwnerId,
        cardOwnerEmail: email,
        cardOwnerPhone: phone,
        expirationMonth: expiryMonth,
        expirationYear: expiryYear
      }
    };
    
    console.log('Setting card owner details:', data);
    masterFrameRef.current.contentWindow.postMessage(data, '*');
  }, [cardholderName, cardOwnerId, email, phone, expiryMonth, expiryYear, isReady, masterFrameRef]);

  return (
    <div className="space-y-4" dir="rtl">
      {isReady && (
        <PaymentIframe
          masterFrameRef={masterFrameRef}
          cardcomUrl={cardcomUrl}
          terminalNumber={terminalNumber}
          onMasterFrameLoad={onMasterFrameLoad}
        />
      )}

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
        <Label htmlFor="cardOwnerId">תעודת זהות</Label>
        <Input
          id="cardOwnerId"
          name="cardOwnerId"
          placeholder="123456789"
          value={cardOwnerId}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '');
            setCardOwnerId(value);
            validateIdNumber(value);
          }}
          maxLength={9}
          className={idNumberError ? 'border-red-500' : ''}
          required
        />
        {idNumberError && (
          <p className="text-sm text-red-500">{idNumberError}</p>
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
          <CardNumberFrame
            terminalNumber={terminalNumber}
            cardcomUrl={cardcomUrl}
            onLoad={() => handleFieldLoad('cardNumber')}
            isReady={isReady}
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
          <CVVFrame
            terminalNumber={terminalNumber}
            cardcomUrl={cardcomUrl}
            onLoad={() => handleFieldLoad('cvv')}
            isReady={isReady}
          />
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
