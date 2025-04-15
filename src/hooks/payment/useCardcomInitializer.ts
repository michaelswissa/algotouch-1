
import { InitConfig } from '@/components/payment/types/payment';

export const useCardcomInitializer = () => {
  const initializeCardcomFields = (masterFrameRef: React.RefObject<HTMLIFrameElement>, lowProfileCode: string, sessionId: string) => {
    // Ensure the iframe is loaded before sending messages
    if (!masterFrameRef.current) {
      console.error("Master frame reference is not available");
      return false;
    }

    console.log('Initializing CardCom fields with:', { 
      lowProfileCode, 
      sessionId,
      hasMasterFrame: Boolean(masterFrameRef.current)
    });

    // We need to ensure iframe is loaded before sending messages
    const checkFrameAndInitialize = () => {
      if (!masterFrameRef.current?.contentWindow) {
        console.warn('Master frame contentWindow not ready, retrying in 100ms');
        setTimeout(checkFrameAndInitialize, 100);
        return;
      }

      try {
        // Initialize CardCom master frame
        const config: InitConfig = {
          action: 'init',
          lowProfileCode,
          sessionId,
          cardFieldCSS: "border:1px solid #ccc;height:40px;width:100%;border-radius:4px;padding:0 8px;",
          cvvFieldCSS: "border:1px solid #ccc;height:40px;width:100%;border-radius:4px;padding:0 8px;",
          language: 'he'
        };

        console.log('Sending initialization config to CardCom iframe');
        masterFrameRef.current.contentWindow.postMessage(config, 'https://secure.cardcom.solutions');
        return true;
      } catch (error) {
        console.error('Error initializing CardCom fields:', error);
        return false;
      }
    };

    // Initial load check
    setTimeout(checkFrameAndInitialize, 300);
    
    // Double-check with a longer delay as backup
    setTimeout(() => {
      if (!document.getElementById('CardComCardNumber')?.contentWindow) {
        console.log('Attempting secondary CardCom initialization');
        checkFrameAndInitialize();
      }
    }, 1000);
    
    return true;
  };

  return { initializeCardcomFields };
};
