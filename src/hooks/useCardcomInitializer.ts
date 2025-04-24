
import { toast } from 'sonner';

/**
 * Initialise CardCom open-fields.
 * Returns true if the init message was posted and we received 'initCompleted'.
 */
export const initializeCardcomFields = async (
  masterRef: React.RefObject<HTMLIFrameElement>,
  lowProfileCode: string,
  terminalNumber: string,
  op: 'payment' | 'token_only' = 'payment',
): Promise<boolean> => {
  const mf = masterRef.current;
  if (!mf) {
    toast.error('Master frame missing');
    return false;
  }

  /* wait until iframe has a contentWindow */
  if (!mf.contentWindow) {
    await new Promise<void>((r) =>
      mf.addEventListener('load', () => r(), { once: true }),
    );
  }

  const payload = {
    action: 'init',
    lowProfileCode,
    terminalNumber: Number(terminalNumber),
    operation: op === 'token_only' ? 'CreateTokenOnly' : 'ChargeOnly',
    cardFieldCSS: '',        // keep empty → CardCom default
    cvvFieldCSS: '',
    reCaptchaFieldCSS: '',
  };
  console.debug('📤 postMessage → master', payload);
  mf.contentWindow!.postMessage(payload, '*');

  /* resolve once CardCom replies */
  return new Promise<boolean>((res) => {
    const to = setTimeout(() => {
      console.warn('initCompleted timeout');
      res(false);
    }, 8_000);

    const handler = (ev: MessageEvent) => {
      if (ev.data?.action !== 'initCompleted') return;
      clearTimeout(to);
      window.removeEventListener('message', handler);
      console.debug('✅ initCompleted received');
      res(true);
    };
    window.addEventListener('message', handler);
  });
};
