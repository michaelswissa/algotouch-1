
import { toast } from 'sonner';

type Operation = 'payment' | 'token_only';

export const useCardcomInitializer = () => {
  /** one promise per page-life so we don't init twice */
  let inFlight: Promise<boolean> | null = null;

  return {
    initializeCardcomFields: async (
      masterFrameRef: React.RefObject<HTMLIFrameElement>,
      lowProfileCode: string,
      terminalNumber: string,
      operation: Operation = 'payment'
    ): Promise<boolean> => {
      if (inFlight) return inFlight;

      inFlight = new Promise<boolean>((resolve) => {
        // 1. Verify iframe exists and is accessible
        const iframe = masterFrameRef.current;
        if (!iframe) {
          console.error('🛑 masterFrameRef empty');
          toast.error('שגיאה בטעינת שדות האשראי (מסגרת חסרה)');
          return resolve(false);
        }

        // 2. Wait for iframe to fully load
        const whenLoaded = new Promise<void>((ok) => {
          if (
            iframe.contentDocument?.readyState === 'complete' ||
            iframe.contentDocument?.readyState === 'interactive'
          ) {
            return ok();
          }
          const onLoad = () => {
            iframe.removeEventListener('load', onLoad);
            ok();
          };
          iframe.addEventListener('load', onLoad);
        });

        // 3. Send initialization message with proper styling
        whenLoaded.then(() => {
          const payload = {
            action: 'init',
            lowProfileCode,
            terminalNumber: Number(terminalNumber),
            operation: operation === 'token_only' ? 'CreateTokenOnly' : 'ChargeOnly',
            cardFieldCSS: `
              body { margin: 0; padding: 0; box-sizing: border-box; }
              .cardNumberField {
                width: 100%;
                height: 100%;
                border: none;
                padding: 0 16px;
                font-size: 16px;
                direction: ltr;
                background: transparent;
              }
              .cardNumberField:focus {
                outline: none;
              }
            `,
            cvvFieldCSS: `
              body { margin: 0; padding: 0; box-sizing: border-box; }
              .cvvField {
                width: 100%;
                height: 100%;
                border: none;
                padding: 0 16px;
                font-size: 16px;
                direction: ltr;
                background: transparent;
              }
              .cvvField:focus {
                outline: none;
              }
            `,
            reCaptchaFieldCSS: 'body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; }',
            placeholder: '1111-2222-3333-4444',
            cvvPlaceholder: '123',
            language: 'he'
          };

          console.debug('📤 Sending init message to CardCom master frame:', payload);
          iframe.contentWindow?.postMessage(payload, '*');
        });

        // 4. Wait for initialization completion or timeout
        const timeout = setTimeout(() => {
          console.warn('⌛️ CardCom initialization timed out after 6s');
          toast.error('שגיאה באתחול שדות האשראי');
          window.removeEventListener('message', handler);
          resolve(false);
        }, 6000);

        const handler = (ev: MessageEvent) => {
          if (typeof ev.data !== 'object' || !ev.data) return;
          if (ev.data.action !== 'initCompleted') return;
          
          console.debug('✅ CardCom initialization completed successfully');
          clearTimeout(timeout);
          window.removeEventListener('message', handler);
          resolve(true);
        };

        window.addEventListener('message', handler);
      });

      return inFlight;
    },
  };
};
