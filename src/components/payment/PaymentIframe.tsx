
import React from 'react';

interface PaymentIframeProps {
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  cardcomUrl: string;
  terminalNumber: string;
  /** optional - lets callers ignore the load event if they wish */
  onMasterFrameLoad?: () => void;
}

const PaymentIframe: React.FC<PaymentIframeProps> = ({
  masterFrameRef,
  cardcomUrl,
  terminalNumber,
  onMasterFrameLoad,
}) => {
  const masterSrc = `${cardcomUrl}/api/openfields/master?terminalNumber=${terminalNumber}`;

  return (
    <div className="relative space-y-4">
      {/* master (hidden) */}
      <iframe
        ref={masterFrameRef}
        id="CardComMasterFrame"
        name="CardComMasterFrame"
        src={masterSrc}
        style={{ width: 0, height: 0, border: 'none', position: 'absolute', top: 0, left: 0 }}
        onLoad={onMasterFrameLoad}
        title="CardCom Master"
      />

      {/* NUMBER – NO params! */}
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

      {/* reCAPTCHA – required for 3-DS */}
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
