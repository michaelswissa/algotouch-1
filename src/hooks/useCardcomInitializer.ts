
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Hook for initializing CardCom OpenFields with proper lowProfileCode and terminalNumber
 */
export const useCardcomInitializer = () => {
  const [initialized, setInitialized] = useState(false);

  const initializeCardcomFields = async (
    masterFrameRef: React.RefObject<HTMLIFrameElement>,
    lowProfileCode: string,
    terminalNumber: string,
    operationType: 'payment' | 'token_only' = 'payment'
  ): Promise<boolean> => {
    try {
      if (!masterFrameRef.current || !lowProfileCode) {
        console.error('Missing required references for CardCom initialization', { 
          hasMasterFrame: Boolean(masterFrameRef.current), 
          lowProfileCode
        });
        return false;
      }

      console.log('Initializing CardCom fields with:', {
        lowProfileCode,
        terminalNumber,
        operationType
      });
      
      // Make sure master frame is loaded
      const frameWindow = masterFrameRef.current.contentWindow;
      if (!frameWindow) {
        console.error('Master frame window not available');
        return false;
      }

      // After frame load, initialize the OpenFields
      return new Promise((resolve) => {
        // Set up a listener for the initialization response
        const handleInitMessage = (event: MessageEvent) => {
          // Verify origin
          if (event.origin !== 'https://secure.cardcom.solutions') {
            return;
          }

          try {
            const data = event.data;
            if (!data) return;

            console.log('Received message from CardCom:', data);

            if (data.action === 'InitCompleted') {
              console.log('CardCom fields initialized successfully');
              setInitialized(true);
              window.removeEventListener('message', handleInitMessage);
              resolve(true);
            } else if (data.action === 'InitError') {
              console.error('Error initializing CardCom fields:', data.message);
              toast.error('שגיאה באתחול שדות התשלום');
              window.removeEventListener('message', handleInitMessage);
              resolve(false);
            }
          } catch (error) {
            console.error('Error handling init message:', error);
            resolve(false);
          }
        };

        // Add the message listener
        window.addEventListener('message', handleInitMessage);

        // CSS specifically targeting iframe elements without affecting the main page
        const cardFieldCSS = `
          #CardComCardNumber input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            height: 40px;
            box-sizing: border-box;
            direction: ltr;
            font-family: 'Rubik', sans-serif;
          }
          #CardComCardNumber input:focus {
            border-color: #7c3aed;
            outline: none;
            box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
          }
        `;

        const cvvFieldCSS = `
          #CardComCvv input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            height: 40px;
            box-sizing: border-box;
            direction: ltr;
            font-family: 'Rubik', sans-serif;
          }
          #CardComCvv input:focus {
            border-color: #7c3aed;
            outline: none;
            box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.2);
          }
        `;

        // Send init message to CardCom with correct lowProfileCode
        console.log('Sending init message to CardCom iframe');
        frameWindow.postMessage({
          action: 'init',
          terminalNumber: terminalNumber,
          lowProfileCode: lowProfileCode,
          cardFieldCSS: cardFieldCSS,
          cvvFieldCSS: cvvFieldCSS,
          placeholder: '1111-2222-3333-4444',
          cvvPlaceholder: '123',
        }, 'https://secure.cardcom.solutions');

        // Set timeout in case we don't get a response
        setTimeout(() => {
          if (!initialized) {
            console.log('CardCom initialization timed out, resolving anyway');
            resolve(true);
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Error during CardCom initialization:', error);
      return false;
    }
  };

  return { initialized, initializeCardcomFields };
};
