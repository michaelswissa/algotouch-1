
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

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
  const [error, setError] = useState<string>('');
  const [cardTypeInfo, setCardTypeInfo] = useState('');

  const handleCardNumberValidation = (event: MessageEvent) => {
    if (!event.origin.includes('cardcom.solutions')) return;
    
    if (event.data?.action === 'handleValidations' && event.data?.field === 'cardNumber') {
      if (!event.data.isValid && event.data.message) {
        setError(event.data.message);
      } else {
        setError('');
      }
      
      if (event.data.cardType) {
        setCardTypeInfo(event.data.cardType);
      }
    }
  };

  React.useEffect(() => {
    window.addEventListener('message', handleCardNumberValidation);
    return () => window.removeEventListener('message', handleCardNumberValidation);
  }, []);

  return (
    <div className="relative">
      <iframe
        id="CardComCardNumber"
        name="CardComCardNumber"
        src={`${cardcomUrl}/External/openFields/card-number.html?terminalnumber=${terminalNumber}&rtl=true`}
        className="w-full h-[40px] border border-input rounded-md"
        onLoad={onLoad}
        title="מספר כרטיס"
        key={`cardnumber-${frameLoadAttempts}`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      {cardTypeInfo && (
        <p className="mt-1 text-sm text-muted-foreground">
          סוג כרטיס: {cardTypeInfo}
        </p>
      )}
    </div>
  );
};

export default CardNumberFrame;
