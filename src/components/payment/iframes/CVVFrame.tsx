
import React, { useEffect, useRef } from 'react';
import '../styles/cardFields.css';

interface CVVFrameProps {
  terminalNumber: string;
  cardcomUrl: string;
  onLoad: () => void;
  isReady: boolean;
}

const CVVFrame: React.FC<CVVFrameProps> = ({
  terminalNumber,
  cardcomUrl,
  onLoad,
  isReady
}) => {
  const iframeSrc = `${cardcomUrl}/api/openfields/CVV?terminalNumber=${terminalNumber}`;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Add effect to reload iframe when needed
  useEffect(() => {
    if (isReady && iframeRef.current) {
      console.log('Initializing CVVFrame');
      
      // Force iframe reload if needed
      if (iframeRef.current.src !== iframeSrc) {
        iframeRef.current.src = iframeSrc;
      }
    }
  }, [isReady, iframeSrc]);
  
  return (
    <div className="credit-cvv-container">
      <div className={`credit-card-field ${!isReady ? 'field-loading' : ''}`}>
        {isReady && (
          <iframe
            ref={iframeRef}
            id="CardComCvv"
            name="CardComCvv"
            src={iframeSrc}
            className="w-full"
            onLoad={onLoad}
            title="קוד אבטחה"
          />
        )}
      </div>
    </div>
  );
};

export default CVVFrame;
