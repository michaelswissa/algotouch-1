
import { InitConfig } from '@/components/payment/types/payment';

export const useCardcomInitializer = () => {
  const initializeCardcomFields = (masterFrameRef: React.RefObject<HTMLIFrameElement>, lowProfileCode: string, sessionId: string) => {
    // Ensure the iframe is loaded before sending messages
    if (!masterFrameRef.current) {
      console.error("Master frame reference is not available");
      return false;
    }

    console.log('Initializing CardCom fields with:', { 
      lowProfileCode, 
      sessionId,
      hasMasterFrame: Boolean(masterFrameRef.current)
    });

    // We need to ensure iframe is loaded before sending messages
    const checkFrameAndInitialize = () => {
      // Check if the iframe and contentWindow exist
      if (!masterFrameRef.current?.contentWindow) {
        console.warn('Master frame contentWindow not ready, retrying in 100ms');
        setTimeout(checkFrameAndInitialize, 100);
        return;
      }

      try {
        // Using CardCom's expected message format as shown in the example files
        const config = {
          action: 'init',
          lowProfileCode,
          sessionId,
          // CardCom CSS styling from example files
          cardFieldCSS: `body { margin: 0; padding: 0; box-sizing: border-box; } 
            #cardNumber { border: 1px solid #ccc; border-radius: 3px; width: 100%; height: 20px; margin: 0; }
            .cardNumberField { border: 1px solid #ccc; border-radius: 4px; height: 40px; width: 100%; padding: 0 10px; font-size: 16px; box-sizing: border-box; } 
            .cardNumberField:focus { border-color: #3498db; outline: none; box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2); } 
            .cardNumberField.invalid { border-color: #e74c3c; box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.2); }`,
          cvvFieldCSS: `body { margin: 0; padding: 0; box-sizing: border-box; } 
            #cvvField { border: 1px solid #ccc; border-radius: 3px; height: 35px; margin: 0; }
            .cvvField { border: 1px solid #ccc; border-radius: 3px; height: 39px; margin: 0; padding: 0 10px; width: 100%; } 
            .cvvField.invalid { border: 1px solid #c01111; }
            /* Chrome, Safari, Edge, Opera */
            input::-webkit-outer-spin-button, input::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
            /* Firefox */
            input[type=number] {
              -moz-appearance: textfield;
            }`,
          reCaptchaFieldCSS: `body { margin: 0; padding:0; display: flex; }`,
          placeholder: "1111-2222-3333-4444",
          cvvPlaceholder: "123",
          language: 'he'
        };

        console.log('Sending initialization config to CardCom iframe');
        masterFrameRef.current.contentWindow.postMessage(config, '*');
        return true;
      } catch (error) {
        console.error('Error initializing CardCom fields:', error);
        return false;
      }
    };

    // Initial load check with delay to ensure iframe is ready
    setTimeout(checkFrameAndInitialize, 300);
    
    // Double-check with a longer delay as backup
    setTimeout(() => {
      const frameElement = document.getElementById('CardComMasterFrame');
      if (frameElement && 'contentWindow' in frameElement && !frameElement.contentWindow) {
        console.log('Attempting secondary CardCom initialization');
        checkFrameAndInitialize();
      }
    }, 1000);
    
    return true;
  };

  return { initializeCardcomFields };
};
