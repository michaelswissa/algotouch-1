
import React from 'react';

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
  // Make sure to include terminalNumber parameter in the URL exactly as in the example
  const iframeSrc = `${cardcomUrl}/api/openfields/CVV?terminalNumber=${terminalNumber}`;
  
  return (
    <div className="relative" style={{ maxWidth: '100px' }}>
      <iframe
        id="CardComCvv"
        name="CardComCvv"
        src={iframeSrc}
        className="w-full h-[40px] border border-input rounded-md"
        onLoad={onLoad}
        title="קוד אבטחה"
        key={`cvv-${frameLoadAttempts}-${terminalNumber}`}
      />
    </div>
  );
};

export default CVVFrame;
