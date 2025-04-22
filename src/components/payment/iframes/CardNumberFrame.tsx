
import React from 'react';
import '../styles/cardFields.css';

interface CardNumberFrameProps {
  terminalNumber: string;
  cardcomUrl: string;
  onLoad: () => void;
  isReady: boolean;
}

const CardNumberFrame: React.FC<CardNumberFrameProps> = ({
  terminalNumber,
  cardcomUrl,
  onLoad,
  isReady
}) => {
  const iframeSrc = `${cardcomUrl}/api/openfields/cardNumber?terminalNumber=${terminalNumber}`;
  
  return (
    <div className="credit-card-field-container">
      <div className={`credit-card-field ${!isReady ? 'field-loading' : ''}`}>
        {isReady && (
          <iframe
            id="CardComCardNumber"
            name="CardComCardNumber"
            src={iframeSrc}
            className="w-full"
            onLoad={onLoad}
            title="מספר כרטיס"
          />
        )}
      </div>
    </div>
  );
};

export default CardNumberFrame;
