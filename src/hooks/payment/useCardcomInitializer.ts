
import { useState } from 'react';

export const useCardcomInitializer = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeCardcomFields = async (
    masterFrameRef: React.RefObject<HTMLIFrameElement>,
    lowProfileCode: string,
    sessionId: string,
    terminalNumber: string,
    operationType: 'payment' | 'token_only' = 'payment'
  ) => {
    if (!masterFrameRef.current?.contentWindow) {
      throw new Error('Master frame not ready');
    }

    try {
      // Convert operation type to CardCom's numeric format
      const operation = operationType === 'token_only' ? '3' : '1'; // Use '3' for token_only, '1' for charge
      
      // This is the correct format for CardCom OpenFields initialization
      const initData = {
        action: 'init', // Corrected: Use 'init' instead of 'initFields'
        lowProfileCode: lowProfileCode,
        LowProfileCode: lowProfileCode, // Duplicate for compatibility
        sessionId: sessionId,
        terminalNumber: terminalNumber,
        cardFieldCSS: '.card-field { width: 100%; height: 40px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }',
        cvvFieldCSS: '.cvv-field { width: 100%; height: 40px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }',
        reCaptchaFieldCSS: '.recaptcha-field { width: 100%; }',
        placeholder: 'מספר כרטיס',
        cvvPlaceholder: 'CVV',
        language: 'he',
        operation: operation // Use the numeric operation value
      };

      console.log('Initializing CardCom fields with:', {
        lowProfileCode,
        sessionId,
        terminalNumber,
        operation
      });

      // Post the initialization message to the master frame
      masterFrameRef.current.contentWindow.postMessage(initData, '*');
      setIsInitialized(true);
      return true;
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
