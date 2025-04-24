
import React, { useEffect } from 'react';
import PaymentIframe from './PaymentIframe';
import CardOwnerDetails from './sections/CardOwnerDetails';
import CardFields from './sections/CardFields';
import SecurityNote from './SecurityNote';
import { usePaymentFields } from '@/hooks/payment/usePaymentFields';

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
  const {
    cardholderName,
    setCardholderName,
    cardOwnerId,
    setCardOwnerId,
    expiryMonth,
    setExpiryMonth,
    expiryYear,
    setExpiryYear,
    email,
    setEmail,
    phone,
    setPhone,
    cardNumberError,
    cardTypeInfo,
    cvvError,
    cardholderNameError,
    expiryError,
    idNumberError,
    validateIdNumber,
    handleFieldLoad
  } = usePaymentFields();

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
    
    console.log('Setting card owner details');
    masterFrameRef.current.contentWindow.postMessage(data, '*');
  }, [cardholderName, cardOwnerId, email, phone, expiryMonth, expiryYear, isReady, masterFrameRef]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Only render PaymentIframe after initialization */}
      {isReady && (
        <PaymentIframe
          masterFrameRef={masterFrameRef}
          cardcomUrl={cardcomUrl}
          terminalNumber={terminalNumber}
          onMasterFrameLoad={onMasterFrameLoad}
        />
      )}

      <CardOwnerDetails
        cardholderName={cardholderName}
        cardOwnerId={cardOwnerId}
        email={email}
        phone={phone}
        cardholderNameError={cardholderNameError}
        idNumberError={idNumberError}
        onCardholderNameChange={setCardholderName}
        onCardOwnerIdChange={setCardOwnerId}
        onEmailChange={setEmail}
        onPhoneChange={setPhone}
        validateIdNumber={validateIdNumber}
      />

      <CardFields
        terminalNumber={terminalNumber}
        cardcomUrl={cardcomUrl}
        isReady={isReady}
        expiryMonth={expiryMonth}
        expiryYear={expiryYear}
        onMonthChange={setExpiryMonth}
        onYearChange={setExpiryYear}
        onFieldLoad={handleFieldLoad}
        cardNumberError={cardNumberError}
        cvvError={cvvError}
        expiryError={expiryError}
        cardTypeInfo={cardTypeInfo}
      />

      <SecurityNote />
    </div>
  );
};

export default PaymentDetails;
