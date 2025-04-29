
import { useState } from 'react';

// Define the CardCom3DS interface to work with the global object
interface CardCom3DS {
  validateFields: () => boolean;
  doPayment: (lowProfileCode: string) => void;
  init: (options: any) => void;
}

// Add type definition for the global window object
declare global {
  interface Window {
    cardcom3DS: CardCom3DS;
  }
}

export const useCardcomInitializer = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeCardcomFields = async (
    masterFrameRef: React.RefObject<HTMLIFrameElement>,
    lowProfileCode: string,
    sessionId: string,
    terminalNumber: string,
    operationType: 'payment' | 'token_only' = 'payment'
  ) => {
    if (!lowProfileCode) {
      console.error('Missing lowProfileCode for CardCom initialization');
      return false;
    }

    try {
      // Convert operation type to CardCom's numeric format
      const operation = operationType === 'token_only' ? '3' : '1'; // Use '3' for token_only, '1' for charge
      
      console.log('Initializing CardCom fields with:', {
        lowProfileCode,
        sessionId,
        terminalNumber,
        operation
      });

      // Check if the cardcom3DS object is available (from the 3DS.js script)
      if (window.cardcom3DS) {
        console.log('CardCom 3DS script found, initializing...');
        
        // Initialize the CardCom 3DS fields
        window.cardcom3DS.init({
          lowProfileCode: lowProfileCode,
          terminalNumber: terminalNumber,
          language: 'he',
          operation: operation
        });
        
        setIsInitialized(true);
        console.log('CardCom 3DS initialization successful');
        return true;
      } else {
        console.error('CardCom 3DS script not found. Make sure it is loaded before initialization.');
        
        // Wait a bit and try again if the script might be still loading
        return new Promise<boolean>((resolve) => {
          setTimeout(() => {
            if (window.cardcom3DS) {
              console.log('CardCom 3DS script found after delay, initializing...');
              
              window.cardcom3DS.init({
                lowProfileCode: lowProfileCode,
                terminalNumber: terminalNumber,
                language: 'he',
                operation: operation
              });
              
              setIsInitialized(true);
              console.log('CardCom 3DS initialization successful after delay');
              resolve(true);
            } else {
              console.error('CardCom 3DS script not available after delay');
              resolve(false);
            }
          }, 1500);
        });
      }
    } catch (error) {
      console.error('Error initializing CardCom fields:', error);
      return false;
    }
  };

  return {
    isInitialized,
    initializeCardcomFields
  };
};
