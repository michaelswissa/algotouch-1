
import { useCallback } from 'react';
import { InitConfig } from '@/components/payment/types/payment';
import { toast } from 'sonner';

export const useCardcomInitializer = () => {
  const initializeCardcomFields = useCallback(async (
    masterFrameRef: React.RefObject<HTMLIFrameElement>, 
    lowProfileCode: string, 
    sessionId: string,
    terminalNumber: string = '160138',
    operationType: 'payment' | 'token_only' = 'payment',
    planId?: string
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
      planId,
      hasMasterFrame: Boolean(masterFrameRef.current)
    });

    try {
      // 1. Wait for the master frame to fully load before sending init message
      await new Promise<void>((resolve) => {
        const frame = masterFrameRef.current;
        
        // If frame is already loaded, continue after a short delay to ensure JS is ready
        if (frame?.contentWindow?.document?.readyState === 'complete') {
          console.log('Master frame already loaded, continuing');
          setTimeout(resolve, 0);
          return;
        }
        
        // Wait for frame load then give its JS a tick to initialize
        console.log('Waiting for master frame to load');
        frame?.addEventListener('load', () => {
          console.log('Master frame load event fired');
          setTimeout(resolve, 0);
        }, { once: true });
      });
      
      console.log('Master frame is fully loaded, preparing init message');
      
      // 2. Determine correct operation type based on plan and operationType
      let operation: string;
      if (operationType === 'token_only') {
        operation = 'CreateTokenOnly';
      } else if (planId === 'annual') {
        operation = 'ChargeAndCreateToken';
      } else {
        operation = 'ChargeOnly';
      }
      
      // 3. Prepare the initialization configuration
      const config: InitConfig = {
        action: 'init',
        lowProfileCode,
        sessionId,
        terminalNumber: String(terminalNumber), // Convert to string to be safe
        operation, // Set correct operation type
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
        language: 'he'
      };

      // 4. Send the init message to the master frame with exact origin
      console.log('📤 postMessage → master', { 
        ...config, 
        operation,
        lowProfileCode: `${lowProfileCode.substring(0, 8)}...`  // Truncate for security in logs
      });
      
      masterFrameRef.current.contentWindow?.postMessage(config, 'https://secure.cardcom.solutions');

      // 5. Wait for initCompleted response with timeout
      return new Promise<boolean>((resolve) => {
        // Set timeout to prevent hanging if no response
        const timeout = setTimeout(() => {
          console.warn('initCompleted timeout');
          resolve(false);
        }, 8000);

        // Listen for the initCompleted message
        const messageHandler = (event: MessageEvent) => {
          // Verify origin strictly - security check
          if (event.origin !== 'https://secure.cardcom.solutions') {
            return;
          }
          
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

export default useCardcomInitializer;
