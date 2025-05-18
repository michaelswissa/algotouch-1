
// This file is kept for backwards compatibility
// It re-exports all error states from the new directory structure
export {
  CriticalErrorState,
  TimeoutWarningState,
  MaxRetriesState,
  NoSubscriptionState,
  UnprocessedPaymentState
} from './error-states';

export type { ErrorStateProps } from './error-states';
export type { UnprocessedPaymentStateProps } from './error-states';
