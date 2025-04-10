
// Types for payment processing

export type TokenData = {
  token: string;
  lastFourDigits: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName?: string;
};

// Define the steps for the subscription flow
export type Steps = 'plan-selection' | 'contract' | 'payment' | 'completion';

export interface RegistrationData {
  email?: string;
  password?: string;
  userData?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  planId?: string;
  paymentToken?: TokenData;
  contractSigned?: boolean;
  contractDetails?: ContractSignatureData | null;
  contractSignedAt?: string;
}

export interface ContractSignatureData {
  tempContractId?: string;
  fullName: string;
  email: string;
  phone?: string;
  signature: string;
  contractHtml: string;
  browserInfo?: any;
  contractVersion?: string;
  agreedToTerms?: boolean;
  agreedToPrivacy?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description?: string;
  features?: string[];
  trialDays?: number;
  billingCycle: 'monthly' | 'annual';
  currency?: string;
}

export interface PaymentError {
  code: string;
  message: string;
  raw?: any;
}

export interface PaymentSessionData {
  sessionId?: string;
  userId?: string;
  email?: string;
  planId?: string;
  paymentDetails?: any;
  expiresAt?: string;
}

export interface CardcomChargeResponse {
  IsApproved: "1" | "0";
  ReturnValue?: number;
  Message?: string;
  TokenApprovalNumber?: string;
}

export interface UserSubscription {
  user_id: string;
  plan_id: string;
  status: "active" | "suspended" | "cancelled";
  renewed_at: string;
  created_at: string;
  fail_count?: number;
  last_attempt_at?: string;
}

export interface LowProfileDealResponse {
  ResponseCode: number;
  Description: string;
  LowProfileId?: string;
  Url?: string;
}

export interface ChargeTokenRequest {
  token: string;
  amount: number;
  userId?: string;
  planId?: string;
  customerId?: string;
  paymentDescription?: string;
  externalId?: string;
}

export interface ChargeTokenResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  approvalNumber?: string;
  errorCode?: string;
  errorDetails?: any;
}

// Constructor for PaymentError class
export class PaymentError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code: string = 'payment_error', details?: any) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
    this.details = details;
  }
}
