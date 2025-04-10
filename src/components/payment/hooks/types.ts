
import { TokenData } from '@/types/payment';

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
    this.code = code;
    this.details = details;
    this.name = 'PaymentError';
  }
}

export interface PaymentErrorHandlingProps {
  planId?: string;
  onCardUpdate?: () => void;
  onAlternativePayment?: () => void;
}

export interface PaymentErrorContext {
  tokenData?: TokenData;
  planId?: string;
  operationType?: number;
  userInfo?: { userId?: string; email?: string } | null;
}

export interface PaymentSessionData {
  sessionId?: string;
  userId?: string;
  email?: string;
  planId?: string;
  paymentDetails?: any;
  expiresAt?: string;
}
