
export enum PaymentStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed'
}

export interface InitConfig {
  lowProfileCode: string;
  sessionId: string;
  terminalNumber: string;
  operationType?: string;
}

export interface PaymentState {
  terminalNumber: string;
  cardcomUrl: string;
  paymentStatus: PaymentStatus;
  sessionId: string;
  lowProfileCode: string;
  cardBrand?: string;
  cardType?: string;
  error?: string;
  isFramesReady: boolean;
  operationType?: 'payment' | 'token_only';
}
