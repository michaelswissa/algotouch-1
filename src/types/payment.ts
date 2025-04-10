
// Types for payment processing

export type TokenData = {
  token: string;
  cardLast4: string;
  expMonth: number;
  expYear: number;
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
  interval: "monthly" | "yearly";
  description?: string;
  features?: string[];
  trialDays?: number;
}

export interface PaymentError {
  code: string;
  message: string;
  raw?: any;
}

export interface PaymentSessionData {
  userId: string;
  planId: string;
  tokenData: TokenData;
  amount: number;
  status: "pending" | "approved" | "failed"; 
  createdAt: string;
}

export interface CardcomChargeResponse {
  IsApproved: "1" | "0";
  ReturnValue: number;
  Message: string;
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
