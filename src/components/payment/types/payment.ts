
export const PaymentStatus = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
  DECLINED: 'declined',
  PENDING_3DS: 'pending_3ds',
  TIMEOUT: 'timeout'
} as const;

export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus];

export interface PaymentSessionData {
  lowProfileCode: string;
  sessionId: string;
  terminalNumber: string;
  cardcomUrl: string;
  reference: string;
}

export interface CardOwnerDetails {
  name: string;
  email: string;
  phone?: string;
  identityNumber?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  displayPrice: string;
  hasTrial: boolean;
  freeTrialDays: number;
}

export interface CardComFieldsInitConfig {
  terminalNumber: string;
  lowProfileCode: string;
  sessionId: string;
  operationType: 'payment' | 'token_only';
}
