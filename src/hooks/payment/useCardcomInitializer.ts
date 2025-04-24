
import { InitConfig } from '@/components/payment/types/payment';

export const useCardcomInitializer = () => {
  const initializeCardcomFields = async (
    masterFrameRef: React.RefObject<HTMLIFrameElement>, 
    lowProfileCode: string, 
    sessionId: string,
    terminalNumber: string = '160138',
    operationType: 'payment' | 'token_only' = 'payment'
  ) => {
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
      const config: InitConfig = {
        action: 'init',
        lowProfileCode,
        sessionId,
        terminalNumber,
        cardFieldCSS: `
          body { margin: 0; padding: 0; box-sizing: border-box; }
          .cardNumberField {
            border: 1px solid #ccc;
            border-radius: 4px;
            height: 40px;
            width: 100%;
            padding: 0 10px;
            font-size: 16px;
            box-sizing: border-box;
            direction: ltr;
          }
          .cardNumberField:focus {
            border-color: #3498db;
            outline: none;
          }
          .cardNumberField.invalid {
            border-color: #e74c3c;
          }`,
        cvvFieldCSS: `
          body { margin: 0; padding: 0; box-sizing: border-box; }
          .cvvField {
            border: 1px solid #ccc;
            border-radius: 3px;
            height: 39px;
            margin: 0;
            padding: 0 10px;
            width: 100%;
            box-sizing: border-box;
            direction: ltr;
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
      masterFrameRef.current.contentWindow.postMessage(config, '*');

      return true;
    } catch (error) {
      console.error('Error initializing CardCom fields:', error);
      return false;
    }
  };

  return { initializeCardcomFields };
};
