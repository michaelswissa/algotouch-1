
import { useEffect } from 'react';
import { InitConfig } from '@/components/payment/types/payment';

export const useCardcomInitializer = () => {
  const initializeCardcomFields = async (
    masterFrameRef: React.RefObject<HTMLIFrameElement>, 
    lowProfileId: string, 
    url: string,
    terminalNumber: string = '160138',
    operationType: 'payment' | 'token_only' = 'payment'
  ) => {
    if (!lowProfileId || !url) {
      console.error("Missing required parameters for CardCom initialization:", { 
        hasLowProfileId: Boolean(lowProfileId), 
        hasUrl: Boolean(url) 
      });
      return false;
    }
    
    if (!masterFrameRef.current) {
      console.error("Master frame reference is not available");
      return false;
    }

    console.log('Starting CardCom fields initialization with:', { 
      lowProfileId, 
      url,
      terminalNumber,
      operationType,
      hasMasterFrame: Boolean(masterFrameRef.current)
    });

    let attempts = 0;
    const maxAttempts = 5;
    
    return new Promise<boolean>((resolve) => {
      const checkFramesAndInitialize = () => {
        attempts++;
        
        if (attempts > maxAttempts) {
          console.error(`Failed to initialize CardCom after ${maxAttempts} attempts`);
          resolve(false);
          return;
        }

        const masterFrame = masterFrameRef.current;
        
        if (!masterFrame?.contentWindow) {
          console.log(`Master frame not ready (attempt ${attempts}/${maxAttempts}), retrying in 500ms`);
          setTimeout(checkFramesAndInitialize, 500);
          return;
        }

        try {
          const config: InitConfig = {
            action: 'init',
            lowProfileId,
            url,
            terminalNumber: Number(terminalNumber),
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
            operation: operationType === 'token_only' ? 'ChargeAndCreateToken' : 'ChargeOnly'
          };

          console.log('Sending initialization config to CardCom iframe');
          masterFrame.contentWindow.postMessage(config, 'https://secure.cardcom.solutions');
          
          // Load 3DS script after initializing fields
          setTimeout(() => {
            loadScript();
            resolve(true);
          }, 1000);
        } catch (error) {
          console.error('Error initializing CardCom fields:', error);
          if (attempts < maxAttempts) {
            setTimeout(checkFramesAndInitialize, 500);
          } else {
            resolve(false);
          }
        }
      };

      const loadScript = () => {
        console.log('Loading 3DS script...');
        const script = document.createElement('script');
        script.src = 'https://secure.cardcom.solutions/External/OpenFields/3DS.js';
        document.head.appendChild(script);
        console.log('3DS script loaded');
      };

      setTimeout(checkFramesAndInitialize, 300);
    });
  };

  return { initializeCardcomFields };
};
