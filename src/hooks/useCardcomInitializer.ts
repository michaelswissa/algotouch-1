
import { InitConfig } from '@/components/payment/types/payment';

export const useCardcomInitializer = () => {
  const initializeCardcomFields = (
    masterFrameRef: React.RefObject<HTMLIFrameElement>, 
    lowProfileCode: string, 
    sessionId: string
  ) => {
    if (!masterFrameRef.current) {
      console.error("Master frame reference is not available");
      return false;
    }

    console.log('Initializing CardCom fields with:', { 
      lowProfileCode, 
      sessionId,
      hasMasterFrame: Boolean(masterFrameRef.current)
    });

    // Load 3DS script dynamically
    const script = document.createElement('script');
    script.src = 'https://secure.cardcom.solutions/External/OpenFields/3DS.js';
    script.async = true;
    document.head.appendChild(script);

    const config = {
      action: 'init',
      lowProfileCode,
      sessionId,
      cardFieldCSS: `
        body { margin: 0; padding: 0; box-sizing: border-box; }
        .cardNumberField {
          border: 1px solid #ccc;
          border-radius: 4px;
          height: 40px;
          width: 100%;
          padding: 0 10px;
          font-size: 16px;
          box-sizing: border-box;
        }
        .cardNumberField:focus {
          border-color: #3498db;
          outline: none;
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
        }
        .cardNumberField.invalid {
          border-color: #e74c3c;
          box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2);
        }`,
      cvvFieldCSS: `
        body { margin: 0; padding: 0; box-sizing: border-box; }
        .cvvField {
          border: 1px solid #ccc;
          border-radius: 3px;
          height: 39px;
          margin: 0;
          padding: 0 10px;
          width: 100%;
        }
        .cvvField.invalid {
          border: 1px solid #c01111;
        }`,
      reCaptchaFieldCSS: `body { margin: 0; padding:0; display: flex; }`,
      placeholder: "1111-2222-3333-4444",
      cvvPlaceholder: "123",
      language: 'he',
      terminalNumber: "160138"
    };

    const initializeFrames = () => {
      if (!masterFrameRef.current?.contentWindow) {
        console.warn('Master frame not ready, retrying...');
        setTimeout(initializeFrames, 100);
        return;
      }

      try {
        console.log('Sending initialization config to CardCom frames');
        masterFrameRef.current.contentWindow.postMessage(config, '*');
        return true;
      } catch (error) {
        console.error('Error initializing CardCom fields:', error);
        return false;
      }
    };

    // Initial attempt after a short delay
    setTimeout(initializeFrames, 300);
    
    // Safety check after 1 second
    setTimeout(() => {
      const frame = document.getElementById('CardComMasterFrame');
      if (frame instanceof HTMLIFrameElement && !frame.contentWindow) {
        console.log('Attempting secondary CardCom initialization');
        initializeFrames();
      }
    }, 1000);

    return true;
  };

  return { initializeCardcomFields };
};
