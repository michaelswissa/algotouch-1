
import { TokenData, CardcomPaymentResponse, CardcomVerifyResponse } from '@/types/payment';

export interface TokenizationOptions {
  terminalNumber: number;
  apiName: string;
  amount: number;
  successUrl: string;
  errorUrl: string;
  webhookUrl: string;
  productName?: string;
  returnValue?: string;
  language?: string;
  operation?: 'ChargeOnly' | 'ChargeAndCreateToken' | 'CreateTokenOnly';
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface TokenizationResult {
  success: boolean;
  url?: string;
  lowProfileId?: string;
  error?: string;
  tempRegistrationId?: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  message?: string;
  paymentDetails?: any;
  tokenInfo?: any;
  error?: string;
  source?: string;
}

export interface TokenStorage {
  tokenId: string;
  userId: string;
  token: string;
  expiryDate: string;
  cardLastFour: string;
  isValid: boolean;
}

export interface PaymentServiceError extends Error {
  code?: string;
  context?: string;
  details?: any;
}
