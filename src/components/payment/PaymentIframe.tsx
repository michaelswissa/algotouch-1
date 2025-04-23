
import React from 'react';

interface PaymentIframeProps {
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  cardcomUrl: string;
  terminalNumber: string;
}

const PaymentIframe: React.FC<PaymentIframeProps> = ({
  masterFrameRef,
  cardcomUrl,
  terminalNumber
}) => {
  const masterFrameUrl = `${cardcomUrl}/api/openfields/master?terminalNumber=${terminalNumber}`;

  return (
    <div className="space-y-4">
      <iframe
        ref={masterFrameRef}
        id="CardComMasterFrame"
        name="CardComMasterFrame"
        src={masterFrameUrl}
        style={{ display: 'none' }}
        title="CardCom Master Frame"
      />
      <div className="space-y-2">
        <iframe
          id="CardComCardNumber"
          name="CardComCardNumber"
          src={`${cardcomUrl}/api/openfields/cardNumber?terminalNumber=${terminalNumber}`}
          className="w-full h-[57px] border-none"
          title="מספר כרטיס"
        />
        <iframe
          id="CardComCvv"
          name="CardComCvv"
          src={`${cardcomUrl}/api/openfields/CVV?terminalNumber=${terminalNumber}`}
          className="w-[188px] h-[57px] border-none"
          title="קוד אבטחה"
        />
      </div>
    </div>
  );
};

export default PaymentIframe;
