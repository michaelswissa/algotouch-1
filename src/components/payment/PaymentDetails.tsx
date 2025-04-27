
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface PaymentDetailsProps {
  paymentUrl?: string;
  isReady?: boolean;
}

const PaymentDetails: React.FC<PaymentDetailsProps> = ({ 
  paymentUrl,
  isReady = false
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [height, setHeight] = useState(650);
  
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      if (event.origin.includes('cardcom')) {
        const { type, height } = event.data || {};
        if (type === 'resize' && height) {
          setHeight(height);
        }
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, []);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  if (!isReady || !paymentUrl) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col justify-center items-center bg-background/80 z-10">
          <Loader2 className="h-8 w-8 animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">טוען טופס תשלום...</p>
        </div>
      )}

      <iframe
        id="cardcom-frame"
        src={paymentUrl}
        style={{
          width: '100%',
          height: `${height}px`,
          border: 0,
          overflow: 'hidden'
        }}
        onLoad={handleIframeLoad}
        allow="payment *; clipboard-write"
        sandbox="allow-forms allow-same-origin allow-scripts"
        title="CardCom Payment"
      />
    </div>
  );
};

export default PaymentDetails;
