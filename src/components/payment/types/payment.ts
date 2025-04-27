
export type PaymentStatusType = 'idle' | 'initializing' | 'processing' | 'success' | 'failed';

export const PaymentStatus = {
  IDLE: 'idle' as const,
  INITIALIZING: 'initializing' as const,
  PROCESSING: 'processing' as const,
  SUCCESS: 'success' as const,
  FAILED: 'failed' as const,
};

export interface PaymentSessionData {
  sessionId: string;
  lowProfileCode: string;
  terminalNumber: string;
  url?: string;
  reference?: string;
}
