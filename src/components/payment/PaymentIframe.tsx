
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
  // Ensure we use the master frame URL from CardCom
  const masterFrameUrl = `${cardcomUrl}/api/openfields/master?terminalNumber=${terminalNumber}`;

  return (
    <iframe
      ref={masterFrameRef}
      id="CardComMasterFrame"
      name="CardComMasterFrame"
      src={masterFrameUrl}
      style={{ display: 'block', width: '0px', height: '0px', border: 'none' }}
      title="CardCom Master Frame"
    />
  );
};

export default PaymentIframe;
