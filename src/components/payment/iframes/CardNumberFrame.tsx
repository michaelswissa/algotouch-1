
import React from 'react';
import { CardFieldProps } from '../types/payment';
import PaymentIframe from './PaymentIframe';

const CardNumberFrame: React.FC<CardFieldProps> = ({
  terminalNumber,
  cardcomUrl,
  onLoad,
  isReady
}) => {
  const iframeSrc = `${cardcomUrl}/api/openfields/cardNumber?terminalNumber=${terminalNumber}`;
  
  return (
    <div className="credit-card-field-container">
      <PaymentIframe
        id="CardComCardNumber"
        name="CardComCardNumber"
        src={iframeSrc}
        title="מספר כרטיס"
        onLoad={onLoad}
        isReady={isReady}
      />
    </div>
  );
};

export default CardNumberFrame;
