
import React from 'react';
import PaymentIframe from './PaymentIframe';

interface ReCaptchaFrameProps {
  terminalNumber: string;
  cardcomUrl: string;
  onLoad: () => void;
}

const ReCaptchaFrame: React.FC<ReCaptchaFrameProps> = ({
  terminalNumber,
  cardcomUrl,
  onLoad
}) => {
  const iframeSrc = `${cardcomUrl}/api/openfields/reCaptcha?terminalNumber=${terminalNumber}`;
  
  return (
    <div className="relative">
      <PaymentIframe
        id="CardComReCaptcha"
        name="CardComReCaptcha"
        src={iframeSrc}
        title="אימות reCaptcha"
        className="w-full h-[78px] border-none"
        onLoad={onLoad}
        isReady={true}
      />
    </div>
  );
};

export default ReCaptchaFrame;
