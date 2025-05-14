
export enum ErrorCategory {
  SUBSCRIPTION = 'subscription',
  PAYMENT = 'payment',
  NETWORK = 'network',
  AUTHENTICATION = 'auth',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

export interface AppError extends Error {
  category: ErrorCategory;
  code: string;
  userMessage: string;
  details?: Record<string, any>;
  recoverable: boolean;
  retryable: boolean;
}

export interface ErrorTrackingData {
  category: string;
  action: string;
  error: Error | any;
  userId?: string;
  metadata?: Record<string, any>;
}
