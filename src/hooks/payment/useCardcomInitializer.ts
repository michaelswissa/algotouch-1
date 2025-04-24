
import { InitConfig } from '@/components/payment/types/payment';

export const useCardcomInitializer = () => {
  const initializeCardcomFields = async (
    masterFrameRef: React.RefObject<HTMLIFrameElement>, 
    lowProfileCode: string, 
    sessionId: string,
    terminalNumber: string = '160138',
    operationType: 'payment' | 'token_only' = 'payment'
  ) => {
    if (!lowProfileCode || !sessionId) {
      console.error("Missing required parameters for CardCom initialization:", { 
        hasLowProfileCode: Boolean(lowProfileCode), 
        hasSessionId: Boolean(sessionId) 
      });
      return false;
    }
    
    if (!masterFrameRef.current) {
      console.error("Master frame reference is not available");
      return false;
    }

    console.log('Starting CardCom fields initialization with:', { 
      lowProfileCode, 
      sessionId,
      terminalNumber,
      operationType,
      hasMasterFrame: Boolean(masterFrameRef.current)
    });

    return new Promise<boolean>((resolve) => {
      // Wait for the iframe to be fully loaded before sending the config
      const waitForFrameAndInitialize = () => {
        if (!masterFrameRef.current || !masterFrameRef.current.contentWindow) {
          console.log('Master frame not ready, waiting...');
          setTimeout(waitForFrameAndInitialize, 300);
          return;
        }

        // Check if frame is loaded
        if (masterFrameRef.current.contentWindow.document.readyState !== 'complete') {
          masterFrameRef.current.addEventListener('load', () => {
            setTimeout(sendInitConfig, 300); // Short delay after load to ensure JS is ready
          }, { once: true });
        } else {
          // Frame already loaded, send config
          setTimeout(sendInitConfig, 300);
        }
      };

      const sendInitConfig = () => {
        try {
          if (!masterFrameRef.current || !masterFrameRef.current.contentWindow) {
            console.error('Master frame not available for initialization');
            resolve(false);
            return;
          }

          const config: InitConfig = {
            action: 'init',
            lowProfileCode,
            sessionId,
            terminalNumber,
            cardFieldCSS: `
              body { margin: 0; padding: 0; box-sizing: border-box; direction: ltr; }
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
              }
              .cardNumberField.invalid {
                border-color: #e74c3c;
              }`,
            cvvFieldCSS: `
              body { margin: 0; padding: 0; box-sizing: border-box; direction: ltr; }
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
                border-color: #e74c3c;
              }`,
            reCaptchaFieldCSS: 'body { margin: 0; padding:0; display: flex; justify-content: center; }',
            placeholder: "1111-2222-3333-4444",
            cvvPlaceholder: "123",
            language: 'he',
            operation: operationType === 'token_only' ? 'CreateTokenOnly' : 'ChargeOnly'
          };

          console.log('Sending initialization config to CardCom iframe:', {
            lowProfileCode: config.lowProfileCode,
            terminalNumber: config.terminalNumber,
            operation: config.operation
          });

          // Set a timestamp to break cache
          const timestamp = new Date().getTime();
          
          // Post the configuration to the iframe
          masterFrameRef.current.contentWindow.postMessage(config, 'https://secure.cardcom.solutions');
          
          // Load 3DS script
          const script = document.createElement('script');
          script.src = `https://secure.cardcom.solutions/External/OpenFields/3DS.js?v=${timestamp}`;
          document.head.appendChild(script);
          
          console.log('3DS script loaded, waiting for init completion');
          
          // Set up listener for init completion
          const messageListener = (event: MessageEvent) => {
            if (event.origin === 'https://secure.cardcom.solutions' && event.data?.action === 'initCompleted') {
              console.log('✅ CardCom initialization completed');
              window.removeEventListener('message', messageListener);
              resolve(true);
            }
          };
          
          window.addEventListener('message', messageListener);
          
          // Add timeout to prevent hanging
          setTimeout(() => {
            window.removeEventListener('message', messageListener);
            console.log('CardCom initialization timed out, proceeding anyway');
            resolve(true); // Resolve even if timeout to prevent blocking
          }, 8000);
          
        } catch (error) {
          console.error('Error initializing CardCom fields:', error);
          resolve(false);
        }
      };

      // Start the process
      waitForFrameAndInitialize();
    });
  };

  return { initializeCardcomFields };
};
