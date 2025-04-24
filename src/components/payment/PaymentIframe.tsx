
import React, { useEffect } from 'react';

interface PaymentIframeProps {
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  cardcomUrl: string;
  terminalNumber: string;
  onMasterFrameLoad?: () => void;
}

const PaymentIframe: React.FC<PaymentIframeProps> = ({
  masterFrameRef,
  cardcomUrl,
  terminalNumber,
  onMasterFrameLoad,
}) => {
  // Add the 3DS.js script when the component mounts
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://secure.cardcom.solutions/External/OpenFields/3DS.js?v=' + Date.now();
    document.head.appendChild(script);
    
    // Cleanup function to remove script when component unmounts
    return () => {
      try {
        document.head.removeChild(script);
      } catch (e) {
        // Script might have already been removed
      }
    };
  }, []);

  // Master frame URL has terminal number as query param
  const masterFrameUrl = `${cardcomUrl}/api/openfields/master?terminalNumber=${terminalNumber}`;

  return (
    <div className="relative space-y-4">
      {/* Hidden master frame */}
      <iframe
        ref={masterFrameRef}
        id="CardComMasterFrame"
        name="CardComMasterFrame"
        src={masterFrameUrl}
        style={{ width: 0, height: 0, border: 'none', position: 'absolute' }}
        onLoad={onMasterFrameLoad}
        title="CardCom Master"
      />

      {/* CARD NUMBER - with terminalNumber query param */}
      <div className="w-full h-[57px] border border-input bg-background rounded-md overflow-hidden">
        <iframe
          id="CardComCardNumber"
          name="CardComCardNumber"
          src={`${cardcomUrl}/api/openfields/cardNumber?terminalNumber=${terminalNumber}`}
          className="w-full h-full"
          title="מספר כרטיס"
        />
      </div>

      {/* CVV - with terminalNumber query param */}
      <div className="w-[188px] h-[57px] border border-input bg-background rounded-md overflow-hidden">
        <iframe
          id="CardComCvv"
          name="CardComCvv"
          src={`${cardcomUrl}/api/openfields/CVV?terminalNumber=${terminalNumber}`}
          className="w-full h-full"
          title="CVV"
        />
      </div>

      {/* No manual reCAPTCHA frame - will be injected by 3DS.js when needed */}
    </div>
  );
};

export default PaymentIframe;
