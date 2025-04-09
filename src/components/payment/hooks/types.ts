import { TokenData } from '@/types/payment';

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

export interface PaymentSession {
  id: string;
  user_id?: string;
  email?: string;
  plan_id: string;
  payment_details: any;
  expires_at: string;
  created_at: string;
}

export interface PaymentErrorInfo {
  userId: string | 'anonymous';
  context: string;
  timestamp: string;
  errorMessage: string;
  errorCode: string;
  rawError: string;
  paymentDetails: string | null;
  userAgent: string;
  url: string;
}

export interface PaymentRecoveryLog {
  id: string;
  email: string;
  session_id: string;
  error_info: any;
  recovery_url: string;
  created_at: string;
}

export interface CardExpiryInfo {
  isExpiring: boolean;
  daysUntilExpiry?: number;
  cardLastFour?: string;
  expiryDate?: string;
  error?: string;
}
