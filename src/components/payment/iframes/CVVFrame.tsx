
import React from 'react';
import { CardFieldProps } from '../types/payment';
import PaymentIframe from './PaymentIframe';

const CVVFrame: React.FC<CardFieldProps> = ({
  terminalNumber,
  cardcomUrl,
  onLoad,
  isReady
}) => {
  const iframeSrc = `${cardcomUrl}/api/openfields/CVV?terminalNumber=${terminalNumber}`;
  
  return (
    <div className="credit-cvv-container">
      <PaymentIframe
        id="CardComCvv"
        name="CardComCvv"
        src={iframeSrc}
        title="קוד אבטחה"
        onLoad={onLoad}
        isReady={isReady}
      />
    </div>
  );
};

export default CVVFrame;
