
import React, { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
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
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  const loadFrame = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeSrc;
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    onLoad();
  };

  const handleError = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setTimeout(loadFrame, 1000); // Retry after 1 second
    }
  };
  
  useEffect(() => {
    if (isReady && iframeRef.current) {
      setIsLoading(true);
      loadFrame();
    }
  }, [isReady, iframeSrc]);

  if (!isReady) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <div className="credit-card-field-container relative">
      {isLoading && <Skeleton className="absolute inset-0 z-10" />}
      <div className={`credit-card-field ${!isReady ? 'field-loading' : ''}`}>
        <iframe
          ref={iframeRef}
          id="CardComCardNumber"
          name="CardComCardNumber"
          className="w-full"
          onLoad={handleLoad}
          onError={handleError}
          title="מספר כרטיס"
        />
      </div>
    </div>
  );
};

export default CardNumberFrame;
