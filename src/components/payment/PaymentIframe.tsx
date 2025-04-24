
import React from 'react';

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
  const masterSrc = `${cardcomUrl}/api/openfields/master?terminalNumber=${terminalNumber}`;
  
  // All iframes must include terminalNumber for proper initialization
  const cardNumberSrc = `${cardcomUrl}/api/openfields/cardNumber?terminalNumber=${terminalNumber}`;
  const cvvSrc = `${cardcomUrl}/api/openfields/CVV?terminalNumber=${terminalNumber}`;
  const recaptchaSrc = `${cardcomUrl}/api/openfields/recaptcha?terminalNumber=${terminalNumber}`;

  return (
    <div className="relative space-y-4">
      {/* Master frame (hidden) - handles communication */}
      <iframe
        ref={masterFrameRef}
        id="CardComMasterFrame"
        name="CardComMasterFrame"
        src={masterSrc}
        style={{ width: 0, height: 0, border: 'none', position: 'absolute', top: 0, left: 0 }}
        onLoad={onMasterFrameLoad}
        title="CardCom Master"
      />

      {/* Card Number field */}
      <div className="w-full h-[57px] border border-input bg-background rounded-md overflow-hidden">
        <iframe
          id="CardComCardNumber"
          name="CardComCardNumber"
          src={cardNumberSrc}
          className="w-full h-full"
          title="מספר כרטיס"
        />
      </div>

      {/* CVV field */}
      <div className="w-[188px] h-[57px] border border-input bg-background rounded-md overflow-hidden">
        <iframe
          id="CardComCvv"
          name="CardComCvv"
          src={cvvSrc}
          className="w-full h-full"
          title="CVV"
        />
      </div>

      {/* reCAPTCHA frame - required for 3DS */}
      <div className="w-full h-[80px] overflow-hidden">
        <iframe
          id="CardComReCaptcha"
          name="CardComReCaptcha"
          src={recaptchaSrc}
          className="w-full h-full"
          title="reCAPTCHA"
        />
      </div>
    </div>
  );
};

export default PaymentIframe;
