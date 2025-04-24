
// Payment status types
export const PaymentStatus = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed'
} as const;

export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus];

// CardCom operation types
export type CardComOperationType = 'payment' | 'token_only';

// CardCom initialization config type
export interface InitConfig {
  action: 'init';
  lowProfileCode: string;
  sessionId: string;
  terminalNumber: string;
  cardFieldCSS: string;
  cvvFieldCSS: string;
  reCaptchaFieldCSS: string;
  placeholder: string;
  cvvPlaceholder: string;
  language: string;
  operation: 'ChargeOnly' | 'ChargeAndCreateToken' | 'CreateTokenOnly';
}

// Payment state type definition
export interface PaymentState {
  paymentStatus: PaymentStatusType;
  lowProfileCode: string;
  sessionId: string;
  terminalNumber: string;
  cardcomUrl: string;
  isReady: boolean;
  is3DSInProgress: boolean;
}
