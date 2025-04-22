
import React from 'react';
import '../styles/cardFields.css';

interface CVVFrameProps {
  terminalNumber: string;
  cardcomUrl: string;
  onLoad: () => void;
  frameLoadAttempts: number;
}

const CVVFrame: React.FC<CVVFrameProps> = ({
  terminalNumber,
  cardcomUrl,
  onLoad,
  frameLoadAttempts
}) => {
  const iframeSrc = `${cardcomUrl}/api/openfields/CVV?terminalNumber=${terminalNumber}`;
  
  return (
    <div className="relative credit-cvv-container">
      <iframe
        id="CardComCvv"
        name="CardComCvv"
        src={iframeSrc}
        className="w-full"
        onLoad={onLoad}
        title="קוד אבטחה"
        key={`cvv-${frameLoadAttempts}-${terminalNumber}`}
      />
    </div>
  );
};

export default CVVFrame;
