
import { SubscriptionDetails, Subscription } from '@/types/subscription';

// Define interface for the useSubscription hook return value
export interface UseSubscriptionReturn {
  subscription: Subscription | null;
  loading: boolean;
  details: SubscriptionDetails | null;
  error: string | null;
  cancelSubscription: (reason: string, feedback?: string) => Promise<boolean>;
  reactivateSubscription: () => Promise<boolean>;
  refreshSubscription: () => Promise<boolean>;
  checkForUnprocessedPayments: () => Promise<boolean>;
}

// Define options for the useSubscription hook
export interface UseSubscriptionOptions {
  autoRefresh?: boolean;
  onError?: (error: Error) => void;
}

// Define interface for the useSubscriptionStatus hook return value
export interface SubscriptionStatusState {
  loading: boolean;
  hasUnprocessedPayment: boolean;
  specificLowProfileId: string;
  isAutoProcessing: boolean;
  checkError: string | null;
  retryCount: number;
  maxRetriesReached: boolean;
  loadingTimeout: boolean;
  criticalError: boolean;
  subscriptionLoading: boolean;
  subscription: Subscription | null;
  handleRefresh: () => Promise<void>;
  isLoading: boolean;
}
