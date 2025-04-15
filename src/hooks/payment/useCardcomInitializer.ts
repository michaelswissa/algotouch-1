
import { RefObject } from 'react';

export const useCardcomInitializer = () => {
  const initializeCardcomFields = (
    masterFrameRef: RefObject<HTMLIFrameElement>,
    lowProfileCode: string, 
    sessionId: string
  ) => {
    if (!masterFrameRef.current) {
      console.error("Master frame ref not available");
      return;
    }

    // Function to check if iframe is loaded and ready
    const isFrameReady = () => {
      try {
        return !!masterFrameRef.current && !!masterFrameRef.current.contentWindow;
      } catch (e) {
        console.error("Error checking if frame is ready:", e);
        return false;
      }
    };

    // Function to send initialization message
    const sendInitMessage = () => {
      if (!isFrameReady()) return false;

      const initMessage = {
        action: 'init',
        lowProfileCode: lowProfileCode,
        sessionId: sessionId,
        cardFieldCSS: `
          input {
            font-family: 'Assistant', sans-serif;
            font-size: 16px;
            text-align: right;
            direction: rtl;
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #ccc;
            width: 100%;
            box-sizing: border-box;
          }
          input:focus {
            border-color: #3b82f6;
            outline: none;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
          }
          .invalid { 
            border: 2px solid #ef4444; 
            box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
          }
        `,
        cvvFieldCSS: `
          input {
            font-family: 'Assistant', sans-serif;
            font-size: 16px;
            text-align: center;
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #ccc;
            width: 100%;
            box-sizing: border-box;
          }
          input:focus {
            border-color: #3b82f6;
            outline: none;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
          }
          .invalid { 
            border: 2px solid #ef4444;
            box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
          }
        `,
        language: "he"
      };
      
      try {
        console.log("Sending init message to iframe", {
          targetOrigin: 'https://secure.cardcom.solutions',
          hasLowProfileCode: !!initMessage.lowProfileCode,
          hasSessionId: !!initMessage.sessionId
        });
        
        masterFrameRef.current.contentWindow.postMessage(
          initMessage,
          'https://secure.cardcom.solutions'
        );
        return true;
      } catch (error) {
        console.error("Error sending init message to iframe:", error);
        return false;
      }
    };

    // Try to initialize with multiple attempts
    let attempts = 0;
    const maxAttempts = 5;
    
    const attemptInterval = setInterval(() => {
      console.log(`Initialization attempt ${attempts + 1} of ${maxAttempts}`);
      
      if (sendInitMessage() || attempts >= maxAttempts - 1) {
        clearInterval(attemptInterval);
        if (attempts >= maxAttempts - 1 && !sendInitMessage()) {
          console.error("Failed to initialize CardCom fields after maximum attempts");
          throw new Error('אירעה שגיאה באתחול שדות התשלום');
        }
      }
      attempts++;
    }, 1000);
  };

  return { initializeCardcomFields };
};
