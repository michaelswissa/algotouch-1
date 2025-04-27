
// Define payment status types
export type PaymentStatusType = 'idle' | 'initializing' | 'processing' | 'success' | 'failed';

export const PaymentStatus = {
  IDLE: 'idle' as const,
  INITIALIZING: 'initializing' as const,
  PROCESSING: 'processing' as const,
  SUCCESS: 'success' as const,
  FAILED: 'failed' as const,
};
