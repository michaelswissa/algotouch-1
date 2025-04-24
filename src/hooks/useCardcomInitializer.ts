
import { toast } from 'sonner';

/**
 * Initialise CardCom open-fields:
 *   1. wait for master iframe to be ready
 *   2. post the 'init' message with the minimum payload
 * Returns true on success.
 */
export const initializeCardcomFields = async (
  masterRef: React.RefObject<HTMLIFrameElement>,
  lowProfileCode: string,
  terminalNumber: string,
  op: 'payment' | 'token_only' = 'payment'
): Promise<boolean> => {
  const iframe = masterRef.current;
  if (!iframe) {
    console.error('🛑 masterFrameRef empty');
    toast.error('שגיאה בטעינת שדות האשראי');
    return false;
  }

  /* 1 ─ wait for the iframe to finish loading */
  if (!iframe.contentWindow) {
    await new Promise<void>((res) =>
      iframe.addEventListener('load', () => res(), { once: true })
    );
  }

  /* 2 ─ post the init message */
  const msg = {
    action: 'init',
    lowProfileCode,
    terminalNumber: Number(terminalNumber),
    operation: op === 'token_only' ? 'CreateTokenOnly' : 'ChargeOnly',
  };
  iframe.contentWindow!.postMessage(msg, '*');
  console.debug('📤 init posted to master frame', msg);

  /* 3 ─ assume success (CardCom populates child iframes asynchronously) */
  return true;
};
