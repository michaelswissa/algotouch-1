
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
      const initData = {
        action: 'initFields',
        lowProfileCode,
        sessionId,
        terminalNumber,
        userInterface: {
          language: 'he',
          theme: 'light',
          cssUrl: null,
        }
      };

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
