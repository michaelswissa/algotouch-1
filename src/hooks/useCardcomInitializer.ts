
import { InitConfig } from '@/components/payment/types/payment';

export const useCardcomInitializer = () => {
  const initializeCardcomFields = async (
    masterFrameRef: React.RefObject<HTMLIFrameElement>, 
    lowProfileCode: string, 
    sessionId: string,
    terminalNumber: string = '160138', // Default terminal number if not provided
    operationType: 'payment' | 'token_only' = 'payment'
  ) => {
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
      terminalNumber,
      operationType,
      hasMasterFrame: Boolean(masterFrameRef.current)
    });

    // Track initialization attempts
    let attempts = 0;
    const maxAttempts = 5;
    let isInitialized = false;

    const checkFramesAndInitialize = () => {
      attempts++;
      
      if (attempts > maxAttempts) {
        console.error(`Failed to initialize CardCom after ${maxAttempts} attempts`);
        return false;
      }

      // Check if the master frame and iframes exist
      const masterFrame = masterFrameRef.current;
      
      if (!masterFrame?.contentWindow) {
        console.log(`Master frame not ready (attempt ${attempts}/${maxAttempts}), retrying in 500ms`);
        setTimeout(checkFramesAndInitialize, 500);
        return false;
      }

      try {
        // Match configuration structure with GitHub example
        const config: InitConfig = {
          action: 'init',
          lowProfileCode,
          sessionId,
          terminalNumber,
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
              box-sizing: border-box;
            }
            .cvvField:focus {
              border-color: #3498db;
              outline: none;
            }
            .cvvField.invalid {
              border: 1px solid #c01111;
            }`,
          reCaptchaFieldCSS: 'body { margin: 0; padding:0; display: flex; }',
          placeholder: "1111-2222-3333-4444",
          cvvPlaceholder: "123",
          language: 'he',
          operation: operationType === 'token_only' ? 'ChargeAndCreateToken' : 'ChargeOnly'
        };

        console.log('Sending initialization config to CardCom iframe');
        masterFrame.contentWindow.postMessage(config, '*');
        isInitialized = true;

        // Load 3DS script AFTER initialization is complete
        setTimeout(() => {
          loadScript();
        }, 1000);

        return true;
      } catch (error) {
        console.error('Error initializing CardCom fields:', error);
        if (attempts < maxAttempts) {
          setTimeout(checkFramesAndInitialize, 500);
        }
        return false;
      }
    };

    // Load 3DS script dynamically with cache busting
    const loadScript = () => {
      console.log('Loading 3DS script...');
      const script = document.createElement('script');
      const time = new Date().getTime();
      script.src = 'https://secure.cardcom.solutions/External/OpenFields/3DS.js?v=' + time;
      document.head.appendChild(script);
      console.log('3DS script loaded');
    };

    // Initial check with a short delay to ensure iframe is loaded
    setTimeout(checkFramesAndInitialize, 300);
    
    return true;
  };

  return { initializeCardcomFields };
};
