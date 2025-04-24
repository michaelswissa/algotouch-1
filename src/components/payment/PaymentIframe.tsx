
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
  const masterFrameUrl = `${cardcomUrl}/api/openfields/master?terminalNumber=${terminalNumber}`;

  return (
    <div className="payment-frames-container relative space-y-4">
      {/* hidden master frame used for postMessage transport */}
      <iframe
        ref={masterFrameRef}
        id="CardComMasterFrame"
        name="CardComMasterFrame"
        src={masterFrameUrl}
        style={{
          width: 0,
          height: 0,
          border: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
        onLoad={onMasterFrameLoad}
        title="CardCom Master Frame"
      />

      {/* card number */}
      <div className="w-full h-[57px] border border-input bg-background rounded-md overflow-hidden">
        <iframe
          id="CardComCardNumber"
          name="CardComCardNumber"
          src={`${cardcomUrl}/api/openfields/cardNumber?terminalNumber=${terminalNumber}`}
          className="w-full h-full"
          title="מספר כרטיס"
        />
      </div>

      {/* CVV */}
      <div className="w-[188px] h-[57px] border border-input bg-background rounded-md overflow-hidden">
        <iframe
          id="CardComCvv"
          name="CardComCvv"
          src={`${cardcomUrl}/api/openfields/CVV?terminalNumber=${terminalNumber}`}
          className="w-full h-full"
          title="CVV"
        />
      </div>

      {/* reCAPTCHA – required when 3-DS is on */}
      <div className="w-full h-[80px] overflow-hidden">
        <iframe
          id="CardComReCaptcha"
          name="CardComReCaptcha"
          src={`${cardcomUrl}/api/openfields/recaptcha?terminalNumber=${terminalNumber}`}
          className="w-full h-full"
          title="reCAPTCHA"
        />
      </div>
    </div>
  );
};

export default PaymentIframe;
