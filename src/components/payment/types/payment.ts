
// Define payment status types
export type PaymentStatusType = 'idle' | 'initializing' | 'processing' | 'success' | 'failed';

export const PaymentStatus = {
  IDLE: 'idle' as const,
  INITIALIZING: 'initializing' as const,
  PROCESSING: 'processing' as const,
  SUCCESS: 'success' as const,
  FAILED: 'failed' as const,
};

// CardCom Configuration Types
export interface CardComTerminalConfig {
  terminalNumber: string;
  apiName: string;
  apiPassword?: string;
}

export interface CardComUIConfig {
  language?: 'he' | 'en';
  theme?: 'light' | 'dark';
  cssUrl?: string | null;
  isHideCardOwnerName?: boolean;
  isHideCardOwnerEmail?: boolean;
  isHideCardOwnerPhone?: boolean;
  isHideCardOwnerIdentityNumber?: boolean;
  isHideCVV?: boolean;
}

export interface CardComOperationConfig {
  operation: CardComOperation;
  amount: number;
  currency?: 'ILS' | 'USD';
  numberOfPayments?: number;
}

export interface CardComFieldsInitConfig {
  lowProfileCode: string;
  sessionId: string;
  terminalNumber: string;
  userInterface?: CardComUIConfig;
  operation?: CardComOperation;
  placeholder?: string;
  cvvPlaceholder?: string;
}

export type CardComOperation = 'ChargeOnly' | 'ChargeAndCreateToken' | 'CreateTokenOnly' | 'SuspendedDeal';

// Payment Session Data
export interface PaymentSessionData {
  sessionId: string;
  lowProfileCode: string;
  terminalNumber: string;
  cardcomUrl?: string;
  url?: string;
  reference?: string;
}

// CardCom Response Types
export interface CardComPaymentResponse {
  ResponseCode: number;
  Description: string;
  LowProfileId?: string;
  Url?: string;
  UrlToPayPal?: string;
  UrlToBit?: string;
  TranzactionInfo?: CardComTransactionInfo;
  TokenInfo?: CardComTokenInfo;
}

export interface CardComTransactionInfo {
  ResponseCode: number;
  Description: string;
  TranzactionId: number;
  ApprovalNumber?: string;
  Last4CardDigits: number;
  CardMonth: number;
  CardYear: number;
  CardType?: string;
  CardBrand?: string;
}

export interface CardComTokenInfo {
  Token: string;
  TokenExDate: string;
  CardYear: number;
  CardMonth: number;
  TokenApprovalNumber?: string;
}

// Payment Method Types
export interface PaymentMethod {
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
  cardType?: string;
  token?: string;
}

export interface CardOwnerDetails {
  cardOwnerName: string;
  cardOwnerId?: string;
  cardOwnerEmail: string;
  cardOwnerPhone?: string;
  expirationMonth: string;
  expirationYear: string;
}

export interface PaymentError {
  code: string;
  message: string;
  details?: any;
}

// Subscription plan definitions
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  displayPrice: string;
  description: string;
  hasTrial: boolean;
  freeTrialDays: number;
  isPopular?: boolean;
  features: string[];
}

export interface SubscriptionPlans {
  monthly: SubscriptionPlan;
  annual: SubscriptionPlan;
  vip: SubscriptionPlan;
}
