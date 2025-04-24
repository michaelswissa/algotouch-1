
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
        const frame = masterFrameRef.current;
        if (!frame) {
          console.error('🛑 masterFrameRef empty');
          return resolve(false);
        }

        // Guarantee frame is ready
        const whenLoaded = new Promise<void>((ok) => {
          if (frame.contentWindow) return ok();
          frame.addEventListener('load', () => ok(), { once: true });
        });

        // Send minimal initialization message
        whenLoaded.then(() => {
          const payload = {
            action: 'init',
            lowProfileCode,
            terminalNumber: Number(terminalNumber),
            operation: operation === 'token_only' ? 'CreateTokenOnly' : 'ChargeOnly'
          };

          console.debug('📤 Sending init message to CardCom master frame:', payload);
          frame.contentWindow?.postMessage(payload, '*');
          resolve(true);
        });
      });

      return inFlight;
    }
  };
};
