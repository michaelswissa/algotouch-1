
import { ReactNode } from 'react';

export interface UsePaymentProcessProps {
  planId: string;
  onPaymentComplete: () => void;
}

export class PaymentError extends Error {
  code?: string;
  details?: any;
  recoverySessionId?: string;
  recoveryAction?: 'update_card' | 'alternative_payment' | 'retry';

  constructor(message: string, code?: string, details?: any) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
    this.details = details;
  }
}

export interface RegistrationResult {
  success: boolean;
  userId?: string;
  error?: any;
}

export interface PaymentSessionData {
  sessionId: string;
  userId?: string;
  email?: string;
  planId: string;
  paymentDetails?: any;
  expiresAt: string;
}

export interface PaymentErrorData {
  errorCode: string;
  errorMessage: string;
  context?: string;
  paymentDetails?: any;
  recoverySessionId?: string;
}
