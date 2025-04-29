
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
  const iframeSrc = `${cardcomUrl}/Interface/LowProfile.aspx?TerminalNumber=${terminalNumber}&frame=recaptcha`;
  
  return (
    <div className="flex justify-start mt-2" style={{ minHeight: '78px' }}>
      <iframe
        id="CardComCaptchaIframe"
        name="CardComCaptchaIframe"
        src={iframeSrc}
        style={{ height: '78px', width: '300px', border: 'none', overflow: 'hidden' }}
        onLoad={onLoad}
        title="אימות אנושי"
      />
    </div>
  );
};

export default ReCaptchaFrame;
