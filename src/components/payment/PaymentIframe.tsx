
import React, { useEffect } from 'react';

interface PaymentIframeProps {
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  cardcomUrl: string;
  terminalNumber: string;
  onMasterFrameLoad?: () => void;
  isReady?: boolean; // This prop indicates if we have lowProfileCode and sessionId
}

const PaymentIframe: React.FC<PaymentIframeProps> = ({
  masterFrameRef,
  cardcomUrl,
  terminalNumber,
  onMasterFrameLoad,
  isReady = false, // Default to false
}) => {
  // Add the 3DS.js script when the component mounts
  useEffect(() => {
    console.log('Loading 3DS script...');
    const script = document.createElement('script');
    script.src = `${cardcomUrl}/External/OpenFields/3DS.js?v=${Date.now()}`;
    document.head.appendChild(script);
    
    // Cleanup function to remove script when component unmounts
    return () => {
      try {
        document.head.removeChild(script);
      } catch (e) {
        // Script might have already been removed
      }
    };
  }, [cardcomUrl]);

  // Master frame URL always has terminal number as query param
  const masterFrameUrl = `${cardcomUrl}/api/openfields/master?terminalNumber=${terminalNumber}`;
  
  // Card/CVV URL construction happens when we've decided to render
  const cardNumberUrl = `${cardcomUrl}/api/openfields/cardNumber?terminalNumber=${terminalNumber}`;
  const cvvUrl = `${cardcomUrl}/api/openfields/CVV?terminalNumber=${terminalNumber}`;

  // Log the master frame load event for debugging
  const handleMasterFrameLoad = () => {
    console.log('💡 Master frame loaded - PaymentIframe component');
    if (onMasterFrameLoad) {
      onMasterFrameLoad();
    }
  };

  return (
    <div className="relative space-y-4">
      {/* Hidden master iframe - ALWAYS render this */}
      <iframe
        ref={masterFrameRef}
        id="CardComMasterFrame"
        name="CardComMasterFrame"
        src={masterFrameUrl}
        style={{ width: 0, height: 0, border: 'none', position: 'absolute' }}
        onLoad={handleMasterFrameLoad}
        title="CardCom Master"
      />

      {/* CARD NUMBER - with terminalNumber query param */}
      <div className="w-full h-[57px] border border-input bg-background rounded-md overflow-hidden">
        <iframe
          id="CardComCardNumber"
          name="CardComCardNumber"
          src={cardNumberUrl}
          className="w-full h-full"
          title="מספר כרטיס"
        />
      </div>

      {/* CVV - with terminalNumber query param */}
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
