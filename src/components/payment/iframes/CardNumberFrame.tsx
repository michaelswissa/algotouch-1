
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
  const iframeSrc = `${cardcomUrl}/api/openfields/cardNumber?terminalNumber=${terminalNumber}`;
  
  return (
    <div className="relative">
      <iframe
        id="CardComCardNumber"
        name="CardComCardNumber"
        src={iframeSrc}
        className="w-full h-[40px] border border-input rounded-md"
        onLoad={onLoad}
        title="מספר כרטיס"
        key={`cardnumber-${frameLoadAttempts}-${terminalNumber}`}
      />
    </div>
  );
};

export default CardNumberFrame;
