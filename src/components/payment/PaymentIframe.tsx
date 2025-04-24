
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
  const masterFrameUrl =
    `${cardcomUrl}/api/openfields/master?terminalNumber=${terminalNumber}`;

  return (
    <div className="relative space-y-4">
      {/* hidden master frame */}
      <iframe
        ref={masterFrameRef}
        id="CardComMasterFrame"
        name="CardComMasterFrame"
        src={masterFrameUrl}
        style={{ width: 0, height: 0, border: 'none', position: 'absolute' }}
        onLoad={onMasterFrameLoad}
        title="CardCom Master"
      />

      {/* CARD NUMBER  – exactly like demo */}
      <div className="w-full h-[57px] border border-input bg-background rounded-md overflow-hidden">
        <iframe
          id="CardComCardNumber"
          name="CardComCardNumber"
          src={`${cardcomUrl}/api/openfields/cardNumber`}
          className="w-full h-full"
          title="מספר כרטיס"
        />
      </div>

      {/* CVV */}
      <div className="w-[188px] h-[57px] border border-input bg-background rounded-md overflow-hidden">
        <iframe
          id="CardComCvv"
          name="CardComCvv"
          src={`${cardcomUrl}/api/openfields/CVV`}
          className="w-full h-full"
          title="CVV"
        />
      </div>

      {/* reCAPTCHA – CardCom requires it for 3-DS */}
      <div className="w-full h-[80px] overflow-hidden">
        <iframe
          id="CardComReCaptcha"
          name="CardComReCaptcha"
          src={`${cardcomUrl}/api/openfields/recaptcha`}
          className="w-full h-full"
          title="reCAPTCHA"
        />
      </div>
    </div>
  );
};

export default PaymentIframe;
