
import React, { useState } from 'react';
import { CardComFieldsInitConfig } from '@/types/payment';

/**
 * Hook for initializing CardCom payment fields
 * Handles the initialization of CardCom fields in iframes
 */
export const useCardcomInitializer = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  
  /**
   * Initialize CardCom payment fields in iframes
   * 
   * @param masterFrameRef - Reference to the master iframe
   * @param lowProfileCode - Unique code for this payment session
   * @param sessionId - Session ID for tracking
   * @param terminalNumber - CardCom terminal number
   * @param operationType - Type of operation (payment or token_only)
   * @returns Promise resolving to boolean indicating success
   */
  const initializeCardcomFields = async (
    masterFrameRef: React.RefObject<HTMLIFrameElement>, 
    lowProfileCode: string, 
    sessionId: string,
    terminalNumber: string = '160138',
    operationType: 'payment' | 'token_only' = 'payment'
  ): Promise<boolean> => {
    // Validate required parameters
    if (!lowProfileCode || !sessionId) {
      console.error("Missing required parameters for CardCom initialization:", { 
        hasLowProfileCode: Boolean(lowProfileCode), 
        hasSessionId: Boolean(sessionId) 
      });
      return false;
    }
    
    // Validate master frame reference
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
          // Prepare CardCom configuration
          const cardNumberFieldCSS = `
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
            }`;

          const cvvFieldCSS = `
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
            }`;
            
          const reCaptchaFieldCSS = 'body { margin: 0; padding:0; display: flex; justify-content: center; }';
          
          // Changed from const to let in case we need to modify it
          let config = {
            action: 'init',
            lowProfileCode,
            LowProfileCode: lowProfileCode,
            sessionId,
            terminalNumber,
            cardFieldCSS: cardNumberFieldCSS,
            cvvFieldCSS: cvvFieldCSS,
            reCaptchaFieldCSS,
            placeholder: "1111-2222-3333-4444",
            cvvPlaceholder: "123",
            language: 'he',
            operation: operationType === 'token_only' ? 'ChargeAndCreateToken' : 'ChargeOnly'
          };

          console.log('Sending initialization config to CardCom iframe:', config);
          masterFrame.contentWindow.postMessage(config, '*');
          
          setTimeout(() => {
            loadScript();
            setIsInitialized(true);
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

      // Load the 3DS script for secure payments
      const loadScript = () => {
        console.log('Loading 3DS script...');
        const script = document.createElement('script');
        const time = new Date().getTime();
        script.src = 'https://secure.cardcom.solutions/External/OpenFields/3DS.js?v=' + time;
        document.head.appendChild(script);
        console.log('3DS script loaded');
      };

      // Start initialization with a slight delay to ensure frames are loaded
      setTimeout(checkFramesAndInitialize, 300);
    });
  };

  return { initializeCardcomFields, isInitialized };
};
