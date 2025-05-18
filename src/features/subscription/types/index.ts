
// Create types file for subscription
export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIAL = 'trial',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PENDING = 'pending'
}

export interface Steps {
  'plan-selection': string;
  'contract': string;
  'payment': string;
  'completion': string;
  [key: string]: string;
}

export type StepKey = keyof Steps;
