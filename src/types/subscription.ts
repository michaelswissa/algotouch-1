
// Define the subscription steps used throughout the application
export type Steps = 'plan-selection' | 'contract' | 'payment' | 'completion';

// Define the subscription plan types
export type PlanType = 'monthly' | 'yearly' | 'vip';

// Define the subscription status types
export type SubscriptionStatus = 'active' | 'trial' | 'cancelled' | 'expired' | 'suspended' | 'pending';

// Define payment method structure
export interface PaymentMethod {
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName?: string;
}

// Define subscription interface
export interface Subscription {
  id: string;
  user_id?: string;
  plan_id?: string;
  plan_type: string;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  next_charge_at?: string | null;
  cancelled_at: string | null;
  payment_method: PaymentMethod | null;
  contract_signed?: boolean;
  contract_signed_at?: string | null;
  token?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Define subscription record interface (matching database format)
export interface SubscriptionRecord {
  id: string;
  user_id?: string;
  plan_id?: string;
  plan_type?: string | null;
  status?: string | null;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
  next_charge_at?: string | null;
  cancelled_at?: string | null;
  payment_method?: any | null;
  contract_signed?: boolean | null;
  contract_signed_at?: string | null;
  token?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// Define subscription details interface
export interface SubscriptionDetails {
  planName: string;
  planPrice: string;
  statusText: string;
  nextBillingDate: string;
  progressValue: number;
  daysLeft: number;
  paymentMethod: PaymentMethod | null;
  cancellationReason?: string;
  cancellationFeedback?: string;
}

// Define cancellation data interface
export interface CancellationData {
  reason: string;
  feedback?: string;
}
