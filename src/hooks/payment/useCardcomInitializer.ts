
import { InitConfig } from '@/components/payment/types/payment';

export const useCardcomInitializer = () => {
  const initializeCardcomFields = (masterFrameRef: React.RefObject<HTMLIFrameElement>, lowProfileCode: string, sessionId: string) => {
    if (!lowProfileCode || !sessionId) {
      console.error("Missing required parameters for CardCom initialization");
      return false;
    }
    
    if (!masterFrameRef.current) {
      console.error("Master frame reference is not available");
      return false;
    }

    console.log('Initializing CardCom fields with:', { 
      lowProfileCode, 
      sessionId,
      hasMasterFrame: Boolean(masterFrameRef.current)
    });

    // Load 3DS script dynamically with cache busting
    const script = document.createElement('script');
    const time = new Date().getTime();
    script.src = 'https://secure.cardcom.solutions/External/OpenFields/3DS.js?v=' + time;
    document.head.appendChild(script);

    // Track initialization attempts
    let attempts = 0;
    const maxAttempts = 5;

    const checkFrameAndInitialize = () => {
      attempts++;
      
      // Give up after max attempts
      if (attempts > maxAttempts) {
        console.error(`Failed to initialize CardCom after ${maxAttempts} attempts`);
        // We could trigger a callback here to notify the parent component
        return false;
      }
      
      // Check if the frame and its content window are ready
      const iframe = masterFrameRef.current;
      if (!iframe || !iframe.contentWindow) {
        console.warn(`Master frame or contentWindow not ready (attempt ${attempts}/${maxAttempts}), retrying in 300ms`);
        setTimeout(checkFrameAndInitialize, 300);
        return false;
      }

      try {
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
          terminalNumber: "160138" // Terminal number for proper initialization
        };

        console.log('Sending initialization config to CardCom iframe');
        iframe.contentWindow.postMessage(config, '*');
        return true;
      } catch (error) {
        console.error('Error initializing CardCom fields:', error);
        
        // Try again if we haven't reached max attempts
        if (attempts < maxAttempts) {
          console.log(`Retrying initialization (attempt ${attempts}/${maxAttempts})`);
          setTimeout(checkFrameAndInitialize, 500);
        }
        return false;
      }
    };

    // Initial check with a short delay to ensure iframe is loaded
    setTimeout(checkFrameAndInitialize, 300);
    
    // Secondary check in case the first one fails
    setTimeout(() => {
      const frame = document.getElementById('CardComMasterFrame');
      if (frame instanceof HTMLIFrameElement && (!frame.contentWindow || attempts < maxAttempts)) {
        console.log('Attempting secondary CardCom initialization');
        checkFrameAndInitialize();
      }
    }, 1000);
    
    return true;
  };

  return { initializeCardcomFields };
};
