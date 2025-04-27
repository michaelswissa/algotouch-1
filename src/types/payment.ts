
// Define payment status types
export type PaymentStatusType = 'idle' | 'initializing' | 'processing' | 'success' | 'failed' | 'declined' | 'pending_3ds' | 'timeout';

export const PaymentStatus = {
  IDLE: 'idle' as const,
  INITIALIZING: 'initializing' as const,
  PROCESSING: 'processing' as const,
  SUCCESS: 'success' as const,
  FAILED: 'failed' as const,
  DECLINED: 'declined' as const,
  PENDING_3DS: 'pending_3ds' as const,
  TIMEOUT: 'timeout' as const
};

// Define transaction types
export type TransactionType = 'payment' | 'refund' | 'authorize' | 'capture';

export const TransactionType = {
  PAYMENT: 'payment' as const,
  REFUND: 'refund' as const,
  AUTHORIZE: 'authorize' as const,
  CAPTURE: 'capture' as const
};

// Define operation types
export type OperationType = 'ChargeOnly' | 'ChargeAndCreateToken' | 'CreateTokenOnly' | 'SuspendedDeal' | 'Do3DSAndSubmit';

export const OperationType = {
  CHARGE_ONLY: 'ChargeOnly' as const,
  CHARGE_AND_CREATE_TOKEN: 'ChargeAndCreateToken' as const,
  CREATE_TOKEN_ONLY: 'CreateTokenOnly' as const,
  SUSPENDED_DEAL: 'SuspendedDeal' as const,
  DO_3DS_AND_SUBMIT: 'Do3DSAndSubmit' as const
};
