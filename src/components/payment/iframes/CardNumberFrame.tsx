
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
  const iframeSrc = isReady ? `${cardcomUrl}/api/openfields/cardNumber?terminalNumber=${terminalNumber}` : '';
  
  return (
    <div className="credit-card-field-container">
      <div className={`credit-card-field ${!isReady ? 'field-loading' : ''}`}>
        {isReady ? (
          <iframe
            id="CardComCardNumber"
            name="CardComCardNumber"
            src={iframeSrc}
            className="w-full h-full"
            onLoad={onLoad}
            title="מספר כרטיס"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="h-5 w-5 border-t-2 border-primary rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardNumberFrame;
