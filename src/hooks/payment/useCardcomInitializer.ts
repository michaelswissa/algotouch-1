
import { InitConfig, OperationType } from '@/components/payment/types/payment';

export const useCardcomInitializer = () => {
  const initializeCardcomFields = async (
    masterFrameRef: React.RefObject<HTMLIFrameElement>, 
    lowProfileId: string, 
    sessionId: string,
    terminalNumber: string,
    operationType: 'payment' | 'token_only' = 'payment',
    planType?: string
  ) => {
    if (!lowProfileId) {
      console.error("Missing required parameter lowProfileId for CardCom initialization");
      return false;
    }
    
    if (!masterFrameRef.current) {
      console.error("Master frame reference is not available");
      return false;
    }

    console.log('Starting CardCom fields initialization with:', { 
      lowProfileId, 
      sessionId,
      terminalNumber,
      operationType,
      planType,
      hasMasterFrame: Boolean(masterFrameRef.current)
    });

    return new Promise<boolean>((resolve, reject) => {
      // Wait for master frame to be fully loaded
      const waitForMasterFrame = async () => {
        const frame = masterFrameRef.current;
        if (!frame) {
          console.error("Master frame is not available");
          reject(new Error("Master frame not available"));
          return;
        }

        // Check if frame is already loaded
        if (frame.contentWindow?.document.readyState === 'complete') {
          console.log("Master frame already loaded");
          setTimeout(() => initializeFields(), 300);
        } else {
          // Wait for frame to load
          console.log("Waiting for master frame to load");
          frame.addEventListener('load', () => {
            console.log("Master frame load event triggered");
            setTimeout(() => initializeFields(), 300);
          }, { once: true });
        }
      };

      // Initialize fields once frame is loaded
      const initializeFields = () => {
        try {
          const frame = masterFrameRef.current;
          if (!frame?.contentWindow) {
            console.error("Master frame content window not available");
            reject(new Error("Frame content window not available"));
            return;
          }

          const config: InitConfig = {
            action: 'init',
            lowProfileId,
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
            operation: getOperationType(operationType, planType)
          };

          console.log('📤 Sending initialization config to CardCom iframe:', {
            action: config.action,
            lowProfileId: config.lowProfileId,
            terminalNumber: config.terminalNumber,
            operation: config.operation
          });
          
          // Send the config to the iframe with proper origin
          frame.contentWindow.postMessage(config, 'https://secure.cardcom.solutions');
          
          // Set up event listener for initialization completion
          const messageListener = (event: MessageEvent) => {
            // Verify origin for security
            if (event.origin !== 'https://secure.cardcom.solutions') {
              return;
            }
            
            const message = event.data;
            console.log('📬 Received response from CardCom iframe:', message);
            
            if (message?.action === 'initCompleted') {
              console.log('✅ CardCom initialization completed successfully');
              window.removeEventListener('message', messageListener);
              loadScript();
              resolve(true);
            }
          };
          
          // Add message listener with timeout
          window.addEventListener('message', messageListener);
          
          // Set timeout to avoid hanging
          setTimeout(() => {
            window.removeEventListener('message', messageListener);
            console.log('⚠️ CardCom initialization timed out, continuing anyway');
            loadScript();
            resolve(true);
          }, 5000);
        } catch (error) {
          console.error('Error initializing CardCom fields:', error);
          reject(error);
        }
      };

      const loadScript = () => {
        console.log('Loading 3DS script...');
        const script = document.createElement('script');
        script.src = 'https://secure.cardcom.solutions/External/OpenFields/3DS.js';
        document.head.appendChild(script);
        console.log('3DS script loaded');
      };

      waitForMasterFrame();
    });
  };

  // Helper to determine the correct operation type based on plan and payment type
  const getOperationType = (operationType: 'payment' | 'token_only', planType?: string): OperationType => {
    if (operationType === 'token_only') {
      return 'CreateTokenOnly';
    } else if (planType === 'annual') {
      return 'ChargeAndCreateToken';
    } else {
      return 'ChargeOnly';
    }
  };

  return { initializeCardcomFields };
};
