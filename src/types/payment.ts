
// Define payment status types
export type PaymentStatusType = 'idle' | 'initializing' | 'processing' | 'success' | 'failed';

export const PaymentStatus = {
  IDLE: 'idle' as const,
  INITIALIZING: 'initializing' as const,
  PROCESSING: 'processing' as const,
  SUCCESS: 'success' as const,
  FAILED: 'failed' as const,
};

export enum PaymentStatusEnum {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export interface PaymentSessionData {
  lowProfileId: string;
  sessionId: string;
  terminalNumber: string;
  cardcomUrl: string;
  reference: string;
  url?: string;
}

export interface CardOwnerDetails {
  cardOwnerName: string;
  cardOwnerId: string;
  cardOwnerEmail: string;
  cardOwnerPhone: string;
  expirationMonth: string;
  expirationYear: string;
}

export interface CardComPaymentResponse {
  success: boolean;
  message?: string;
  data?: {
    transactionId?: string;
    sessionId?: string;
    status?: string;
    [key: string]: any;
  };
}

export interface PaymentError {
  code: string;
  message: string;
}

// Interface for initialization config sent to CardCom iframe
export interface CardComFieldsInitConfig {
  action: 'init';
  lowProfileCode: string;
  LowProfileCode: string; // Duplicate for compatibility
  sessionId: string;
  terminalNumber: string;
  cardFieldCSS: string;
  cvvFieldCSS: string;
  reCaptchaFieldCSS: string;
  placeholder: string;
  cvvPlaceholder: string;
  language: string;
  operation: string;
}

// Interface for transaction request sent to CardCom iframe
export interface CardComTransactionRequest {
  action: 'doTransaction';
  cardOwnerName: string;
  cardOwnerId: string;
  cardOwnerEmail: string;
  cardOwnerPhone: string;
  expirationMonth: string;
  expirationYear: string;
  numberOfPayments: string;
  ExternalUniqTranId: string;
  TerminalNumber: string;
  Operation: string;
  lowProfileCode: string;
  LowProfileCode: string;
  Document?: {
    Name: string;
    Email: string;
    TaxId: string;
    Phone: string;
    DocumentTypeToCreate: string;
  };
}

// Adding the PlanDetails interface for subscription plans
export interface PlanDetails {
  id: string;
  name: string;
  displayName?: string;
  description: string;
  price: number;
  displayPrice: string;
  billingFrequency: 'monthly' | 'yearly' | 'one-time';
  featured?: boolean;
  hasTrial?: boolean;
  freeTrialDays?: number;
  features?: string[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  displayPrice: string;
  hasTrial?: boolean;
  freeTrialDays?: number;
}
