export interface TokenData {
  token?: string;
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  simulated?: boolean;
  [key: string]: string | number | boolean | null | TokenData[] | undefined; // Adding index signature for Json compatibility
}

export interface ContractSignatureData {
  contractHtml?: string;
  signature?: string;
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
  contractVersion?: string;
  browserInfo?: {
    userAgent: string;
    language: string;
    platform: string;
    screenSize: string;
    timeZone: string;
    [key: string]: any;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  trialDays: number;
  billingCycle: 'monthly' | 'annual' | 'one-time';
  currency?: string;
}

export interface PaymentHistoryItem {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'trial_started' | 'cancelled';
  paymentMethod: TokenData | null;
  paymentDate: string;
}

export interface RegistrationData {
  email: string;
  password: string;
  planId: string;
  contractSigned?: boolean;
  contractSignedAt?: string;
  contractDetails?: ContractSignatureData;
  userData: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  registrationTime: string;
  paymentToken?: {
    token?: string;
    expiry?: string;
    last4Digits?: string;
    cardholderName?: string;
  };
}

export interface CardcomPaymentResponse {
  success: boolean;
  url?: string;
  error?: string;
  lowProfileId?: string; // Updated from transactionId to match the new API
  tempRegistrationId?: string;
  simulated?: boolean;
}

export interface CardcomVerifyResponse {
  success: boolean;
  message?: string; // Added the missing message property
  paymentDetails?: {
    transactionId: number;
    amount: number;
    cardLastDigits: string;
    approvalNumber: string;
    cardType: string;
    cardExpiry: string;
    cardOwnerName: string;
    cardOwnerEmail: string;
    cardOwnerPhone: string;
  };
  tokenInfo?: {
    token: string;
    expiryDate: string;
    approvalNumber: string;
  };
  registrationId?: string;
  error?: string;
  details?: any;
}

// Add new interfaces for Cardcom's API responses
export interface CardcomPayload {
  ResponseCode: number;
  Description?: string;
  LowProfileId: string;
  TranzactionId?: number | string;
  ReturnValue?: string;
  Operation?: "ChargeOnly" | "ChargeAndCreateToken" | "CreateTokenOnly" | "SuspendedDeal" | "Do3DSAndSubmit";
  TokenInfo?: CardcomTokenInfo;
  TranzactionInfo?: CardcomTransactionInfo;
  UIValues?: CardcomUIValues;
  DocumentInfo?: CardcomDocumentInfo;
}

export interface CardcomWebhookPayload {
  ResponseCode: number;
  Description?: string;
  LowProfileId: string;
  TranzactionId?: number | string;
  ReturnValue?: string;
  Operation?: "ChargeOnly" | "ChargeAndCreateToken" | "CreateTokenOnly" | "SuspendedDeal" | "Do3DSAndSubmit";
  TokenInfo?: CardcomTokenInfo;
  TranzactionInfo?: CardcomTransactionInfo;
  UIValues?: CardcomUIValues;
  DocumentInfo?: CardcomDocumentInfo;
}

export interface CardcomTokenInfo {
  Token: string;
  TokenExDate: string;
  CardYear?: number;
  CardMonth?: number;
  TokenApprovalNumber?: string;
  CardOwnerIdentityNumber?: string;
}

export interface CardcomTransactionInfo {
  ResponseCode: number;
  Description?: string;
  TranzactionId: number;
  TerminalNumber: number;
  Amount: number;
  CoinId: number;
  CardMonth: number;
  CardYear: number;
  ApprovalNumber?: string;
  CardInfo?: string;
  Last4CardDigits: string | number;
  CardOwnerName?: string;
  CardOwnerEmail?: string;
  CardOwnerPhone?: string;
  CardOwnerIdentityNumber?: string;
  CardName?: string;
}

export interface CardcomUIValues {
  CardOwnerEmail?: string;
  CardOwnerName?: string;
  CardOwnerPhone?: string;
  CardOwnerIdentityNumber?: string;
  NumOfPayments?: number;
  CardYear?: number;
  CardMonth?: number;
  CustomFields?: Array<{Id: number, Value: string}>;
  IsAbroadCard?: boolean;
}

export interface CardcomDocumentInfo {
  ResponseCode: number;
  Description: string;
  DocumentType: string;
  DocumentNumber: number;
  AccountId?: number;
  DocumentUrl?: string;
}

// API configuration response
export interface CardcomConfigResponse {
  terminalNumber: string;
  apiName: string;
  hasApiPassword: boolean;
}
