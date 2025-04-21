
import { InitConfig } from '@/components/payment/types/payment';

export const useCardcomInitializer = () => {
  const initializeCardcomFields = (
    masterFrameRef: React.RefObject<HTMLIFrameElement>, 
    lowProfileCode: string, 
    sessionId: string,
    terminalNumber: string,
    operationType: 'payment' | 'token_only' = 'payment'
  ) => {
    if (!masterFrameRef.current || !terminalNumber) {
      console.error("Master frame reference or terminal number is not available");
      return false;
    }

    console.log('Initializing CardCom fields with:', { 
      lowProfileCode, 
      sessionId,
      terminalNumber,
      operationType,
      hasMasterFrame: Boolean(masterFrameRef.current)
    });

    try {
      // Load 3DS script dynamically - similar to example
      const script = document.createElement('script');
      const time = new Date().getTime();
      script.src = 'https://secure.cardcom.solutions/External/OpenFields/3DS.js?v=' + time;
      document.head.appendChild(script);
      
      // Wait for iframe to be ready
      const checkAndInitialize = () => {
        // Check if iframe is ready
        const iframe = masterFrameRef.current;
        if (!iframe || !iframe.contentWindow) {
          console.log('Master frame or contentWindow not ready, retrying in 100ms');
          setTimeout(checkAndInitialize, 100);
          return;
        }

        // Simple CSS like in the example
        const cardFieldCSS = `
          body { margin: 0; padding: 0; }
          .cardNumberField {
            border: 1px solid #ccc;
            border-radius: 4px;
            height: 40px;
            width: 100%;
            padding: 0 10px;
            font-size: 16px;
          }
          .cardNumberField:focus {
            border-color: #3498db;
            outline: none;
          }
          .cardNumberField.invalid {
            border-color: #e74c3c;
          }`;

        const cvvFieldCSS = `
          body { margin: 0; padding: 0; }
          .cvvField {
            border: 1px solid #ccc;
            border-radius: 3px;
            height: 39px;
            padding: 0 10px;
            width: 100%;
          }
          .cvvField.invalid {
            border: 1px solid #c01111;
          }`;

        // Follow example's simpler config pattern
        const config: InitConfig = {
          action: 'init',
          lowProfileCode,
          sessionId,
          terminalNumber,
          cardFieldCSS,
          cvvFieldCSS,
          language: 'he'
        };

        console.log('Sending initialization message to CardCom iframe');
        iframe.contentWindow.postMessage(config, '*');
        
        // Check init status similar to example
        setTimeout(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({ action: 'checkInitStatus' }, '*');
          }
        }, 1000);
        
        return true;
      };

      // Start initialization after a brief delay
      setTimeout(checkAndInitialize, 300);
      return true;
    } catch (error) {
      console.error('Error initializing CardCom fields:', error);
      return false;
    }
  };

  return { initializeCardcomFields };
};
