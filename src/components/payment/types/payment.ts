
export const PaymentStatus = {
  IDLE: 'idle' as const,
  INITIALIZING: 'initializing' as const,
  PROCESSING: 'processing' as const,
  SUCCESS: 'success' as const,
  FAILED: 'failed' as const
} as const;

export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus];

export interface PaymentResponse {
  success: boolean;
  data: {
    sessionId: string;
    lowProfileCode: string;
    terminalNumber: string;
    cardcomUrl?: string;
    url?: string; // The redirect URL from CardCom
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
  LowProfileCode?: string; // Added for extra compatibility
  sessionId?: string;
  terminalNumber: string;
  cardFieldCSS: string;
  cvvFieldCSS: string;
  reCaptchaFieldCSS: string;
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
  isFramesReady: boolean;
  paymentUrl?: string; // The redirect URL from CardCom
}
