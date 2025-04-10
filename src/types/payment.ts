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
