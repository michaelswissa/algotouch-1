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
  action: 'HandleSubmit' | '3DSProcessStarted' | '3DSProcessCompleted' | 'HandleError' | 'handleValidations';
  data?: any;
  message?: string;
  field?: string;
  isValid?: boolean;
  cardType?: string; // Added to handle card type info
}

export interface InitConfig {
  action: 'init';
  lowProfileCode: string;
  sessionId: string;
  cardFieldCSS: string;
  cvvFieldCSS: string;
  language: string;
}

export interface PaymentState {
  terminalNumber: string;
  cardcomUrl: string;
  paymentStatus: PaymentStatusType;
  sessionId: string;
  lowProfileCode: string;
}
