
import { Json } from "@/integrations/supabase/types";

// Re-export types from the main subscription types file
export type { 
  SubscriptionStatus, 
  Subscription, 
  SubscriptionDetails, 
  PaymentMethod,
  CancellationData
} from '@/types/subscription';

// Define result interface for subscription actions
export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  message?: string;
}

// Define status interface for tracking action states
export interface ActionStatus {
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

// Define common parameters for subscription actions
export interface SubscriptionActionParams {
  userId: string;
  subscriptionId: string;
}

// Define cancellation parameters
export interface CancelSubscriptionParams extends SubscriptionActionParams {
  reason: string;
  feedback?: string;
}
