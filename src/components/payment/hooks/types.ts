
import { ReactNode } from 'react';

export interface UsePaymentProcessProps {
  planId: string;
  onPaymentComplete: () => void;
}

export class PaymentError extends Error {
  code?: string;
  details?: any;

  constructor(message: string) {
    super(message);
    this.name = 'PaymentError';
  }
}

export interface RegistrationResult {
  success: boolean;
  userId?: string;
  error?: any;
}
