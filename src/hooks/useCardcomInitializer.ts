
import { InitConfig } from '@/components/payment/types/payment';

export const useCardcomInitializer = () => {
  const initializeCardcomFields = (
    masterFrameRef: React.RefObject<HTMLIFrameElement>, 
    lowProfileCode: string, 
    sessionId: string,
    operationType: 'payment' | 'token_only' = 'payment'
  ) => {
    if (!masterFrameRef.current) {
      console.error("Master frame reference is not available");
      return false;
    }

    try {
      // פשוט ככל האפשר - טעינת הסקריפט וקונפיגורציה בסיסית
      const script = document.createElement('script');
      script.src = 'https://secure.cardcom.solutions/External/OpenFields/3DS.js?v=' + new Date().getTime();
      document.head.appendChild(script);

      // הגדרות CSS בסיסיות
      const cardFieldCSS = `
        body { margin: 0; padding: 0; box-sizing: border-box; }
        .cardNumberField {
          border: 1px solid #ccc; border-radius: 4px; height: 40px; width: 100%;
          padding: 0 10px; font-size: 16px; box-sizing: border-box;
        }
        .cardNumberField:focus { border-color: #3498db; outline: none; }
        .cardNumberField.invalid { border-color: #e74c3c; }`;

      const cvvFieldCSS = `
        body { margin: 0; padding: 0; box-sizing: border-box; }
        .cvvField {
          border: 1px solid #ccc; border-radius: 3px; height: 39px;
          margin: 0; padding: 0 10px; width: 100%;
        }
        .cvvField.invalid { border: 1px solid #c01111; }`;

      // הגדר את סוג הפעולה באופן מפורש
      const operation = operationType === 'token_only' ? 'ChargeAndCreateToken' : 'ChargeOnly';
      
      // יצירת קונפיגורציה פשוטה
      const config: InitConfig = {
        action: 'init',
        lowProfileCode,
        sessionId,
        cardFieldCSS,
        cvvFieldCSS,
        language: 'he',
        operationType,
        operation,
        placeholder: "1111-2222-3333-4444",
        cvvPlaceholder: "123",
        terminalNumber: "160138"
      };

      // שליחת ההגדרות לאייפריים
      masterFrameRef.current.contentWindow?.postMessage(config, '*');
      
      return true;
    } catch (error) {
      console.error('Error initializing CardCom fields:', error);
      return false;
    }
  };

  return { initializeCardcomFields };
};
