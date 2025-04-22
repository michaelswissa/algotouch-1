
import React, { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import '../styles/cardFields.css';

interface PaymentIframeProps {
  id: string;
  name: string;
  src: string;
  title: string;
  className?: string;
  onLoad: () => void;
  isReady: boolean;
}

const PaymentIframe: React.FC<PaymentIframeProps> = ({
  id,
  name,
  src,
  title,
  className = "w-full",
  onLoad,
  isReady
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  const loadFrame = () => {
    if (iframeRef.current) {
      iframeRef.current.src = src;
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
  }, [isReady, src]);

  if (!isReady) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <div className="payment-iframe-container relative">
      {isLoading && <Skeleton className="absolute inset-0 z-10" />}
      <div className={`payment-iframe-field ${!isReady ? 'field-loading' : ''}`}>
        <iframe
          ref={iframeRef}
          id={id}
          name={name}
          className={className}
          onLoad={handleLoad}
          onError={handleError}
          title={title}
        />
      </div>
    </div>
  );
};

export default PaymentIframe;
