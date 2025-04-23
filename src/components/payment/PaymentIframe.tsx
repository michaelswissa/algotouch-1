
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
  return (
    <iframe
      ref={masterFrameRef}
      id="CardComMasterFrame"
      name="CardComMasterFrame"
      src={`${cardcomUrl}/api/openfields/master?terminalNumber=${terminalNumber}`}
      style={{ display: 'block', width: '0px', height: '0px', border: 'none' }}
      title="CardCom Master Frame"
    />
  );
};

export default PaymentIframe;
