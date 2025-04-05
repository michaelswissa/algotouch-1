
export interface TokenData {
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
}

// Note: This ensures the CardcomPaymentResponse is properly typed
export interface CardcomPaymentResponse {
  success: boolean;
  url?: string;
  error?: string;
  transactionId?: string;
}
