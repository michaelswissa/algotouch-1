
export const PaymentStatus = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
  DECLINED: 'declined',
  PENDING_3DS: 'pending_3ds',
  TIMEOUT: 'timeout'
} as const;

export type PaymentStatusType = keyof typeof PaymentStatus;

export interface PaymentSessionData {
  lowProfileCode: string;
  sessionId: string;
  terminalNumber: string;
  cardcomUrl: string;
  reference: string;
}
