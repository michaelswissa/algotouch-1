
import React from 'react';

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
  return (
    <div className="relative">
      <iframe
        id="CardComCardNumber"
        name="CardComCardNumber"
        src={`${cardcomUrl}/api/openfields/cardNumber`}
        className="w-full h-[40px] border border-input rounded-md"
        onLoad={onLoad}
        title="מספר כרטיס"
        key={`cardnumber-${frameLoadAttempts}-${terminalNumber}`}
        style={{ border: '1px solid #ccc', borderRadius: '4px' }}
      />
    </div>
  );
};

export default CardNumberFrame;
