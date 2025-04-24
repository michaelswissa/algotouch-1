
import { toast } from 'sonner';

/**
 * Initialise CardCom open-fields following the official sample.
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

  // Card field CSS
  const cardFieldCSS = `
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
    }
  `;

  // CVV field CSS
  const cvvFieldCSS = `
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
    }
  `;

  // reCAPTCHA field CSS
  const reCaptchaFieldCSS = 'body { margin: 0; padding: 0; display: flex; justify-content: center; }';

  // Build the init payload exactly like the official sample
  const payload = {
    action: 'init',
    lowProfileCode,
    terminalNumber: Number(terminalNumber),
    operation: op === 'token_only' ? 'CreateTokenOnly' : 'ChargeOnly',
    cardFieldCSS,
    cvvFieldCSS,
    reCaptchaFieldCSS,
    placeholder: '1111-2222-3333-4444',
    cvvPlaceholder: '123',
    language: 'he',
  };

  console.debug('📤 postMessage → master', payload);
  mf.contentWindow!.postMessage(payload, '*');

  /* resolve once CardCom replies with initCompleted */
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
