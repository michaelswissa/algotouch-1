
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
  return (
    <div className="relative" style={{ maxWidth: '100px' }}>
      <iframe
        id="CardComCvv"
        name="CardComCvv"
        src={`${cardcomUrl}/api/openfields/CVV`}
        className="w-full h-[40px] border border-input rounded-md"
        onLoad={onLoad}
        title="קוד אבטחה"
        key={`cvv-${frameLoadAttempts}-${terminalNumber}`}
        style={{ border: '1px solid #ccc', borderRadius: '4px' }}
      />
    </div>
  );
};

export default CVVFrame;
