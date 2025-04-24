
import React from 'react';

interface Props {
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  cardcomUrl: string;          // "https://secure.cardcom.solutions"
  terminalNumber: string;      // e.g. "1000"
  onMasterFrameLoad?: () => void;
}

const PaymentIframe: React.FC<Props> = ({
  masterFrameRef,
  cardcomUrl,
  terminalNumber,
  onMasterFrameLoad,
}) => {
  return (
    <div className="relative space-y-4">
      {/* hidden "bus" frame */}
      <iframe
        ref={masterFrameRef}
        id="CardComMasterFrame"
        name="CardComMasterFrame"
        src={`${cardcomUrl}/api/openfields/master?terminalNumber=${terminalNumber}`}
        style={{ width: 0, height: 0, border: 'none', position: 'absolute' }}
        onLoad={onMasterFrameLoad}
        title="CardCom Master"
      />

      {/* card number - NO query-string */}
      <div className="w-full h-[57px] border border-input bg-background rounded-md overflow-hidden">
        <iframe
          id="CardComCardNumber"
          name="CardComCardNumber"
          src={`${cardcomUrl}/api/openfields/cardNumber`}
          className="w-full h-full"
          title="Credit-Card Number"
        />
      </div>

      {/* CVV - NO query-string */}
      <div className="w-[188px] h-[57px] border border-input bg-background rounded-md overflow-hidden">
        <iframe
          id="CardComCvv"
          name="CardComCvv"
          src={`${cardcomUrl}/api/openfields/CVV`}
          className="w-full h-full"
          title="CVV"
        />
      </div>
    </div>
  );
};

export default PaymentIframe;
