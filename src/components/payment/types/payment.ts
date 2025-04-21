
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
  };
  message?: string;
}

export interface CardComMessage {
  action: string; // More flexible type to accommodate all CardCom message types
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
  cardFieldCSS: string;
  cvvFieldCSS: string;
  language: string;
  operationType?: 'payment' | 'token_only';
  operation?: 'ChargeOnly' | 'ChargeAndCreateToken';
  placeholder?: string;
  cvvPlaceholder?: string;
  terminalNumber?: string; // Add terminal number for proper initialization
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
}
