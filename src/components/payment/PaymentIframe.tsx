
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
    <div className="payment-frames-container">
      {/* Master frame is hidden but needed for communication */}
      <iframe
        ref={masterFrameRef}
        id="CardComMasterFrame"
        name="CardComMasterFrame"
        src={masterFrameUrl}
        style={{ width: 0, height: 0, border: 'none', position: 'absolute' }}
        title="CardCom Master Frame"
      />
      
      {/* Card fields container with proper styling */}
      <div className="card-fields-wrapper space-y-4">
        <div className="card-number-container">
          <iframe
            id="CardComCardNumber"
            name="CardComCardNumber"
            src={`${cardcomUrl}/api/openfields/cardNumber?terminalNumber=${terminalNumber}`}
            className="w-full h-[57px] border border-gray-300 rounded-md"
            title="מספר כרטיס"
          />
        </div>
        <div className="cvv-container">
          <iframe
            id="CardComCvv"
            name="CardComCvv"
            src={`${cardcomUrl}/api/openfields/CVV?terminalNumber=${terminalNumber}`}
            className="w-[188px] h-[57px] border border-gray-300 rounded-md"
            title="קוד אבטחה"
          />
        </div>
      </div>
    </div>
  );
};

export default PaymentIframe;
