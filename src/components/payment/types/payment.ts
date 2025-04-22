
// Define the payment status as a proper union type
export type PaymentStatusType = 'IDLE' | 'INITIALIZING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

// Use const assertion to ensure type safety
export const PaymentStatus = {
  IDLE: 'IDLE' as const,
  INITIALIZING: 'INITIALIZING' as const,
  PROCESSING: 'PROCESSING' as const,
  SUCCESS: 'SUCCESS' as const,
  FAILED: 'FAILED' as const,
};

export interface PaymentResponse {
  success: boolean;
  data: {
    sessionId: string;
    lowProfileCode: string;
    terminalNumber: string;
    cardcomUrl?: string;
  };
  message?: string;
}

export interface CardComMessage {
  action: 'HandleSubmit' | '3DSProcessStarted' | '3DSProcessCompleted' | 'HandleError' | 'handleValidations' | 'tokenCreationStarted' | 'tokenCreationCompleted';
  data?: any;
  message?: string;
  field?: string;
  isValid?: boolean;
  cardType?: string;
}

export interface InitConfig {
  action: 'init';
  lowProfileCode: string;
  sessionId: string;
  terminalNumber: string;
  cardFieldCSS: string;
  cvvFieldCSS: string;
  reCaptchaFieldCSS?: string;
  language: string;
  operationType?: 'payment' | 'token_only';
  placeholder?: string;
  cvvPlaceholder?: string;
  operation?: 'ChargeOnly' | 'ChargeAndCreateToken';
}

export interface PaymentState {
  terminalNumber: string;
  cardcomUrl: string;
  paymentStatus: PaymentStatusType;
  sessionId: string;
  lowProfileCode: string;
  operationType?: 'payment' | 'token_only';
  transactionId?: string;
}

export interface PaymentContextType {
  state: PaymentState;
  initializePayment: () => Promise<PaymentResponse | null>;
  submitPayment: () => void;
  handleRetry: () => void;
  resetPaymentState: () => void;
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  frameKey: number;
}

export interface CardFieldProps {
  terminalNumber: string;
  cardcomUrl: string;
  onLoad: () => void;
  isReady: boolean;
}

export interface PaymentValidationState {
  cardNumberError?: string;
  cardTypeInfo?: string;
  cvvError?: string;
  cardholderNameError?: string;
  expiryError?: string;
  idNumberError?: string;
  isValid: boolean;
}
