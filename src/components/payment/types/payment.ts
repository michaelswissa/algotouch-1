
export const PaymentStatus = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed'
} as const;

export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus];

export interface CardComMessage {
  action: string;
  data?: any;
  message?: string;
  field?: string;
  isValid?: boolean;
  cardType?: string;
  success?: boolean;
}

export interface InitConfig {
  action: 'init';
  lowProfileCode: string;
  sessionId: string;
  cardFieldCSS: string;
  cvvFieldCSS: string;
  language: string;
  operationType?: 'payment' | 'token_only';
  operation?: 'ChargeOnly' | 'ChargeAndCreateToken';
  placeholder?: string;
  cvvPlaceholder?: string;
  terminalNumber?: string;
  reCaptchaFieldCSS?: string;
}

export interface PaymentState {
  terminalNumber: string;
  cardcomUrl: string;
  paymentStatus: PaymentStatusType;
  sessionId: string;
  lowProfileCode: string;
  operationType?: 'payment' | 'token_only';
  transactionId?: string;
  errorMessage?: string;
}
