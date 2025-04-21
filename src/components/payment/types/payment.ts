
export const PaymentStatus = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed'
} as const;

export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus];

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
