
import { SubscriptionDetails } from '@/services/subscription/types';

export interface UseSubscriptionReturn {
  subscription: any;
  loading: boolean;
  details: SubscriptionDetails | null;
  error: string | null;
  cancelSubscription: (reason: string, feedback?: string) => Promise<boolean>;
  reactivateSubscription: () => Promise<boolean>;
  refreshSubscription: () => Promise<boolean>;
  checkForUnprocessedPayments: () => Promise<boolean>;
}

export interface UseSubscriptionOptions {
  autoRefresh?: boolean;
  onError?: (error: Error) => void;
}
