
import React, { useEffect, useRef } from 'react';
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Add effect to reload iframe when needed
  useEffect(() => {
    if (isReady && iframeRef.current) {
      console.log('Initializing CardNumberFrame');
      
      // Force iframe reload if needed
      if (iframeRef.current.src !== iframeSrc) {
        iframeRef.current.src = iframeSrc;
      }
    }
  }, [isReady, iframeSrc]);
  
  return (
    <div className="credit-card-field-container">
      <div className={`credit-card-field ${!isReady ? 'field-loading' : ''}`}>
        {isReady && (
          <iframe
            ref={iframeRef}
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
