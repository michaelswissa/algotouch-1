
import React from 'react';
import '../styles/cardFields.css';

interface CardNumberFrameProps {
  terminalNumber: string;
  cardcomUrl: string;
  onLoad: () => void;
  frameLoadAttempts: number;
}

const CardNumberFrame: React.FC<CardNumberFrameProps> = ({
  terminalNumber,
  cardcomUrl,
  onLoad,
  frameLoadAttempts
}) => {
  const iframeSrc = `${cardcomUrl}/api/openfields/cardNumber?terminalNumber=${terminalNumber}`;
  
  return (
    <div className="relative credit-card-field">
      <iframe
        id="CardComCardNumber"
        name="CardComCardNumber"
        src={iframeSrc}
        className="w-full"
        onLoad={onLoad}
        title="מספר כרטיס"
        key={`cardnumber-${frameLoadAttempts}-${terminalNumber}`}
      />
    </div>
  );
};

export default CardNumberFrame;
