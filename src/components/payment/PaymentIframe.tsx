
import React, { useEffect } from 'react';

interface PaymentIframeProps {
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  cardcomUrl: string;
  terminalNumber: string;
  onMasterFrameLoad?: () => void;
  isReady?: boolean; 
}

const PaymentIframe: React.FC<PaymentIframeProps> = ({
  masterFrameRef,
  cardcomUrl,
  terminalNumber,
  onMasterFrameLoad,
  isReady = false,
}) => {
  // Add the 3DS.js script when the component mounts
  useEffect(() => {
    console.log('Loading 3DS script...');
    const script = document.createElement('script');
    script.src = `${cardcomUrl}/External/OpenFields/3DS.js?v=${Date.now()}`;
    script.async = true;
    document.head.appendChild(script);
    
    return () => {
      try {
        document.head.removeChild(script);
      } catch (e) {
        console.warn('Could not remove 3DS script', e);
      }
    };
  }, [cardcomUrl]);

  const masterFrameUrl = `${cardcomUrl}/api/openfields/master?terminalNumber=${terminalNumber}`;
  const cardNumberUrl = isReady ? `${cardcomUrl}/api/openfields/cardNumber?terminalNumber=${terminalNumber}` : '';
  const cvvUrl = isReady ? `${cardcomUrl}/api/openfields/CVV?terminalNumber=${terminalNumber}` : '';

  const handleMasterFrameLoad = () => {
    console.log('💡 Master frame loaded - PaymentIframe component');
    if (onMasterFrameLoad) {
      onMasterFrameLoad();
    }
  };

  return (
    <div className="relative space-y-4">
      {/* Hidden master iframe */}
      <iframe
        ref={masterFrameRef}
        id="CardComMasterFrame"
        name="CardComMasterFrame"
        src={masterFrameUrl}
        style={{ width: 0, height: 0, border: 'none', position: 'absolute' }}
        onLoad={handleMasterFrameLoad}
        title="CardCom Master"
      />

      {/* CARD NUMBER iframe */}
      <div className="w-full h-[57px] border border-input bg-background rounded-md overflow-hidden">
        <iframe
          id="CardComCardNumber"
          name="CardComCardNumber"
          src={cardNumberUrl}
          className="w-full h-full"
          title="מספר כרטיס"
        />
      </div>

      {/* CVV iframe */}
      <div className="w-[188px] h-[57px] border border-input bg-background rounded-md overflow-hidden">
        <iframe
          id="CardComCvv"
          name="CardComCvv"
          src={cvvUrl}
          className="w-full h-full"
          title="CVV"
        />
      </div>
    </div>
  );
};

export default PaymentIframe;
