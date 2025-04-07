
import { TokenData } from '../utils/paymentHelpers';

export interface UsePaymentProcessProps {
  planId: string;
  onPaymentComplete: () => void;
}

export interface PaymentError extends Error {
  code?: string;
  details?: any;
}

export interface RegistrationResult {
  success: boolean;
  userId?: string;
  error?: any;
}
