
import { useCallback } from 'react';
import { InitConfig } from '@/components/payment/types/payment';
import { toast } from 'sonner';

export const useCardcomInitializer = () => {
  const initializeCardcomFields = useCallback(async (
    masterFrameRef: React.RefObject<HTMLIFrameElement>, 
    lowProfileCode: string, 
    sessionId: string,
    terminalNumber: string = '160138',
    operationType: 'payment' | 'token_only' = 'payment'
  ): Promise<boolean> => {
    if (!lowProfileCode || !sessionId) {
      console.error("Missing required parameters for CardCom initialization");
      return false;
    }
    
    if (!masterFrameRef.current) {
      console.error("Master frame reference is not available");
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
      // 1. Wait for the master frame to fully load before sending init message
      await new Promise<void>((resolve) => {
        const frame = masterFrameRef.current;
        
        // If frame is already loaded, continue after a short delay to ensure JS is ready
        if (frame?.contentWindow?.document?.readyState === 'complete') {
          setTimeout(resolve, 0);
          return;
        }
        
        // Wait for frame load then give its JS a tick to initialize
        frame?.addEventListener('load', () => setTimeout(resolve, 0), { once: true });
      });
      
      console.log('Master frame is fully loaded, sending init message');
      
      // 2. Prepare the initialization configuration
      const config: InitConfig = {
        action: 'init',
        lowProfileCode,
        sessionId,
        terminalNumber: Number(terminalNumber),
        cardFieldCSS: `
          body { margin: 0; padding: 0; box-sizing: border-box; }
          .cardNumberField {
            border: none;
            height: 40px;
            width: 100%;
            padding: 0 10px;
            font-size: 16px;
            box-sizing: border-box;
            direction: ltr;
          }
          .cardNumberField:focus {
            outline: none;
          }
          .cardNumberField.invalid {
            border-color: #e74c3c;
          }`,
        cvvFieldCSS: `
          body { margin: 0; padding: 0; box-sizing: border-box; }
          .cvvField {
            border: none;
            height: 40px;
            width: 100%;
            padding: 0 10px;
            font-size: 16px;
            text-align: center;
            box-sizing: border-box;
            direction: ltr;
          }
          .cvvField:focus {
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

      // 3. Send the init message to the master frame
      console.log('📤 postMessage → master', config);
      masterFrameRef.current.contentWindow?.postMessage(config, '*');

      // 4. Wait for initCompleted response
      return new Promise<boolean>((resolve) => {
        // Set timeout to prevent hanging if no response
        const timeout = setTimeout(() => {
          console.warn('initCompleted timeout');
          resolve(false);
        }, 8000);

        // Listen for the initCompleted message
        const messageHandler = (event: MessageEvent) => {
          if (event.data?.action === 'initCompleted') {
            console.log('✅ initCompleted received');
            clearTimeout(timeout);
            resolve(true);
            window.removeEventListener('message', messageHandler);
          }
        };
        
        window.addEventListener('message', messageHandler);
      });
      
    } catch (error) {
      console.error('Error initializing CardCom fields:', error);
      toast.error('שגיאה באתחול שדות התשלום');
      return false;
    }
  }, []);

  return { initializeCardcomFields };
};
