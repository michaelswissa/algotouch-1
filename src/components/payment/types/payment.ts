// Define payment status types
export type PaymentStatusType = 'idle' | 'initializing' | 'processing' | 'success' | 'failed';

export const PaymentStatus = {
  IDLE: 'idle' as const,
  INITIALIZING: 'initializing' as const,
  PROCESSING: 'processing' as const,
  SUCCESS: 'success' as const,
  FAILED: 'failed' as const,
};

export interface CardOwnerDetails {
  cardOwnerName: string;
  cardOwnerId: string;
  cardOwnerEmail: string;
  cardOwnerPhone: string;
  expirationMonth: string;
  expirationYear: string;
}

export interface PaymentSessionData {
  terminalNumber?: string;
  cardcomUrl?: string;
  lowProfileId?: string;
  sessionId?: string;
  reference?: string;
}

export interface CardComFieldsInitConfig {
  action: 'init';
  lowProfileCode: string;
  sessionId: string;
  terminalNumber: string;
  cardFieldCSS?: string;
  cvvFieldCSS?: string;
  reCaptchaFieldCSS?: string;
  placeholder?: string;
  cvvPlaceholder?: string;
  language?: string;
  operation?: 'ChargeOnly' | 'ChargeAndCreateToken';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  displayPrice: string;
  description: string;
  hasTrial: boolean;
  freeTrialDays?: number;
}

export interface CardComPaymentResponse {
  ResponseCode: number;
  Description: string;
  LowProfileId?: string;
  Url?: string;
}

export interface PaymentError {
  code: string;
  message: string;
}
