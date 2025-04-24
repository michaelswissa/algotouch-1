
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
  LowProfileCode?: string;
  sessionId?: string;
  terminalNumber: number;
  cardFieldCSS: string;
  cvvFieldCSS: string;
  reCaptchaFieldCSS: string;
  language: string;
  operationType?: 'payment' | 'token_only';
  placeholder?: string;
  cvvPlaceholder?: string;
  operation: "ChargeOnly" | "CreateTokenOnly" | "ChargeAndCreateToken";
}

export interface PaymentState {
  terminalNumber: string;
  cardcomUrl: string;
  paymentStatus: PaymentStatusType;
  sessionId: string;
  lowProfileCode: string;
  operationType?: 'payment' | 'token_only';
  transactionId?: string;
  tokenId?: string;
  isFramesReady: boolean;
  isSubmitting?: boolean;
}
