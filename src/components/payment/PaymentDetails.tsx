
import React, { useState, useCallback, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import CardNumberFrame from './iframes/CardNumberFrame';
import CVVFrame from './iframes/CVVFrame';
import ReCaptchaFrame from './iframes/ReCaptchaFrame';
import CardExpiryInputs from './CardExpiryInputs';
import SecurityNote from './SecurityNote';
import { usePaymentValidation } from '@/hooks/payment/usePaymentValidation';
import { PaymentStatus, PaymentStatusType } from './types/payment';
import { Skeleton } from '@/components/ui/skeleton';

interface PaymentDetailsProps {
  terminalNumber: string;
  cardcomUrl: string;
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  frameKey?: number; // Add frameKey prop
  paymentStatus?: PaymentStatusType;
}

const PaymentDetails: React.FC<PaymentDetailsProps> = ({ 
  terminalNumber, 
  cardcomUrl,
  masterFrameRef,
  frameKey,
  paymentStatus
}) => {
  const [cardholderName, setCardholderName] = useState('');
  const [cardOwnerId, setCardOwnerId] = useState(''); // Added ID field
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [isMasterFrameReady, setIsMasterFrameReady] = useState(false);
  const [areFieldsReady, setAreFieldsReady] = useState(false);
  const [loadingFields, setLoadingFields] = useState(new Set<string>());
  
  const {
    cardNumberError,
    cardTypeInfo,
    cvvError,
    cardholderNameError,
    expiryError,
    idNumberError, // Added validation for ID
    isValid,
    validateCardNumber,
    validateCvv,
    validateIdNumber, // Added ID validation
    resetValidation // Move this up before it's used
  } = usePaymentValidation({
    cardholderName,
    cardOwnerId,
    expiryMonth,
    expiryYear
  });

  // Reset loaded fields when frameKey changes or retry is initiated
  useEffect(() => {
    setLoadingFields(new Set());
    setAreFieldsReady(false);
    
    // Reset validation state
    resetValidation();
  }, [frameKey, paymentStatus, resetValidation]);

  useEffect(() => {
    const masterFrame = masterFrameRef.current;
    if (!masterFrame) return;

    const handleMasterLoad = () => {
      console.log('Master frame loaded');
      setIsMasterFrameReady(true);
    };

    masterFrame.addEventListener('load', handleMasterLoad);
    return () => masterFrame.removeEventListener('load', handleMasterLoad);
  }, [masterFrameRef]);

  const handleFieldLoad = useCallback((fieldName: string) => {
    setLoadingFields(prev => {
      const newFields = new Set(prev);
      newFields.add(fieldName);
      
      // Only set fields as ready when both card number and CVV are loaded
      if (newFields.has('cardNumber') && newFields.has('cvv')) {
        console.log('All payment fields loaded');
        setAreFieldsReady(true);
      }
      
      return newFields;
    });
  }, []);
  
  // Reset validation when needed
  useEffect(() => {
    if (frameKey || paymentStatus === PaymentStatus.IDLE) {
      resetValidation();
    }
  }, [frameKey, paymentStatus, resetValidation]);

  // Show fields only when master frame is ready
  const showFields = isMasterFrameReady && paymentStatus !== PaymentStatus.PROCESSING;

  // Show loading skeleton when fields are not ready
  if (!showFields) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  useEffect(() => {
    if (!isMasterFrameReady || !masterFrameRef.current?.contentWindow) return;

    const data = {
      action: 'setCardOwnerDetails',
      data: {
        cardOwnerName: cardholderName,
        cardOwnerId: cardOwnerId, // Added ID field
        cardOwnerEmail: email,
        cardOwnerPhone: phone,
        expirationMonth: expiryMonth,
        expirationYear: expiryYear
      }
    };
    
    masterFrameRef.current.contentWindow.postMessage(data, '*');
  }, [cardholderName, cardOwnerId, email, phone, expiryMonth, expiryYear, isMasterFrameReady, masterFrameRef]);

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
            key={`cardnumber-${frameKey}`} // Add key for reinitialization
            terminalNumber={terminalNumber}
            cardcomUrl={cardcomUrl}
            onLoad={() => handleFieldLoad('cardNumber')}
            isReady={showFields}
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
            key={`cvv-${frameKey}`} // Add key for reinitialization
            terminalNumber={terminalNumber}
            cardcomUrl={cardcomUrl}
            onLoad={() => handleFieldLoad('cvv')}
            isReady={showFields}
          />
          {cvvError && (
            <p className="text-sm text-red-500">{cvvError}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <ReCaptchaFrame
          key={`recaptcha-${frameKey}`} // Add key for reinitialization
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
