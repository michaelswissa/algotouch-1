
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
  const iframeSrc = isReady ? `${cardcomUrl}/Interface/OpenFrame.aspx?TerminalNumber=${terminalNumber}&frame=cvv` : '';
  
  return (
    <div className="credit-cvv-container">
      <div className={`credit-card-field ${!isReady ? 'field-loading' : ''}`}>
        {isReady ? (
          <iframe
            id="CardComCvv"
            name="CardComCvv"
            src={iframeSrc}
            className="w-full"
            onLoad={onLoad}
            title="קוד אבטחה"
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

export default CVVFrame;
