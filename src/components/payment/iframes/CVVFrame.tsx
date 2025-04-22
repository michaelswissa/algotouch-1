
import React from 'react';
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
  
  return (
    <div className="credit-cvv-container">
      <div className={`credit-card-field ${!isReady ? 'field-loading' : ''}`}>
        {isReady && (
          <iframe
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
