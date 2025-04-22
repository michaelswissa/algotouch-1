
export type PaymentStatusType = 'IDLE' | 'INITIALIZING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export const PaymentStatus = {
  IDLE: 'IDLE' as PaymentStatusType,
  INITIALIZING: 'INITIALIZING' as PaymentStatusType,
  PROCESSING: 'PROCESSING' as PaymentStatusType,
  SUCCESS: 'SUCCESS' as PaymentStatusType,
  FAILED: 'FAILED' as PaymentStatusType,
} as const;

export interface PaymentResponse {
  success: boolean;
  data: {
    sessionId: string;
    lowProfileCode: string;
    terminalNumber: string;
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
