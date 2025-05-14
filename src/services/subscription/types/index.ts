
import { Json } from "@/integrations/supabase/types";

export interface PaymentMethod {
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName?: string;
}

export interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  cancelled_at: string | null;
  payment_method: PaymentMethod | Json | null;
  contract_signed?: boolean | null;
}

export interface CancellationData {
  reason: string;
  feedback?: string;
}

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

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  message?: string;
}

export interface ActionStatus {
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export interface SubscriptionActionParams {
  userId: string;
  subscriptionId: string;
}
