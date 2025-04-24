
import { toast } from 'sonner';

/**
 * Initialise CardCom open-fields.
 * Returns true if the init message was posted.
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

  /* wait for iframe to finish loading */
  if (!iframe.contentWindow) {
    await new Promise<void>((r) =>
      iframe.addEventListener('load', () => r(), { once: true })
    );
  }

  /* build minimal payload exactly like CardCom sample */
  const msg = {
    action: 'init',
    lowProfileCode,
    terminalNumber: Number(terminalNumber),
    operation: op === 'token_only' ? 'CreateTokenOnly' : 'ChargeOnly',
    cardFieldCSS: '',
    cvvFieldCSS: '',
    reCaptchaFieldCSS: '',
  };
  iframe.contentWindow!.postMessage(msg, '*');
  console.debug('📤 init posted to master frame', msg);

  return true;
};
