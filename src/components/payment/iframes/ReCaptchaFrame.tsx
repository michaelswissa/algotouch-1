
import React from 'react';

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
      <iframe
        id="CardComReCaptcha"
        name="CardComReCaptcha"
        src={iframeSrc}
        className="w-full h-[78px] border-none"
        onLoad={onLoad}
        title="אימות reCaptcha"
      />
    </div>
  );
};

export default ReCaptchaFrame;
