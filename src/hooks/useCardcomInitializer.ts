
import { InitConfig } from '@/components/payment/types/payment';

export const useCardcomInitializer = () => {
  const initializeCardcomFields = (
    masterFrameRef: React.RefObject<HTMLIFrameElement>, 
    lowProfileCode: string, 
    sessionId: string,
    operationType: 'payment' | 'token_only' = 'payment'
  ) => {
    if (!masterFrameRef.current) {
      console.error("Master frame reference is not available");
      return false;
    }

    console.log('Initializing CardCom fields with:', { 
      lowProfileCode, 
      sessionId,
      operationType,
      hasMasterFrame: Boolean(masterFrameRef.current)
    });

    try {
      // Load 3DS script dynamically with cache busting
      const script = document.createElement('script');
      const time = new Date().getTime();
      script.src = 'https://secure.cardcom.solutions/External/OpenFields/3DS.js?v=' + time;
      document.head.appendChild(script);

      // Track initialization attempts
      let attempts = 0;
      const maxAttempts = 10; // Increase max attempts for better reliability

      const checkFrameAndInitialize = () => {
        attempts++;
        
        // Give up after max attempts
        if (attempts > maxAttempts) {
          console.error(`Failed to initialize CardCom after ${maxAttempts} attempts`);
          return false;
        }
        
        // Check if the frame and its content window are ready
        const iframe = masterFrameRef.current;
        if (!iframe || !iframe.contentWindow) {
          console.warn(`Master frame or contentWindow not ready (attempt ${attempts}/${maxAttempts}), retrying in 500ms`);
          setTimeout(checkFrameAndInitialize, 500);
          return false;
        }

        try {
          // Adjust CSS based on operation type
          const cardFieldCSS = `
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
            }`;

          const cvvFieldCSS = `
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
            }`;

          // CRITICAL: Set correct operation based on operationType
          const operation = operationType === 'token_only' ? 'ChargeAndCreateToken' : 'ChargeOnly';
          
          console.log(`Setting CardCom operation to: ${operation} based on operationType: ${operationType}`);

          // Create initialization config with explicit operation type
          const config: InitConfig = {
            action: 'init',
            lowProfileCode,
            sessionId,
            cardFieldCSS,
            cvvFieldCSS,
            language: 'he',
            operationType, // Pass the operation type explicitly
            operation,     // Explicitly set the operation
            placeholder: "1111-2222-3333-4444",
            cvvPlaceholder: "123",
            terminalNumber: "160138" // Ensure terminal number is passed
          };

          console.log('Sending initialization config to CardCom iframe:', config);
          iframe.contentWindow.postMessage(config, '*');
          
          // Verify initialization after a short delay
          setTimeout(() => {
            if (iframe.contentWindow) {
              iframe.contentWindow.postMessage({ action: 'checkInitStatus' }, '*');
            }
          }, 1000);
          
          return true;
        } catch (error) {
          console.error('Error initializing CardCom fields:', error);
          
          // Retry if we haven't reached max attempts
          if (attempts < maxAttempts) {
            console.log(`Retrying initialization (attempt ${attempts}/${maxAttempts})`);
            setTimeout(checkFrameAndInitialize, 500);
          }
          return false;
        }
      };

      // Initial check with a short delay to ensure iframe is loaded
      setTimeout(checkFrameAndInitialize, 500);
      
      // Secondary check in case the first one fails
      setTimeout(() => {
        const frame = document.getElementById('CardComMasterFrame');
        if (frame instanceof HTMLIFrameElement && (!frame.contentWindow || attempts < maxAttempts)) {
          console.log('Attempting secondary CardCom initialization');
          checkFrameAndInitialize();
        }
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('Critical error in CardCom initialization:', error);
      return false;
    }
  };

  return { initializeCardcomFields };
};
