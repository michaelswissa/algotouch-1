
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export const useSubscriptionRefresh = (
  actionsRefresh: () => Promise<boolean>,
  contextRefresh: () => Promise<void>,
  onError?: (error: Error) => void
) => {
  const [error, setError] = useState<string | null>(null);

  const refreshSubscription = useCallback(async (): Promise<boolean> => {
    let success = false;
    setError(null);
    try {
      // First refresh from subscription actions
      await actionsRefresh();
      
      // Then refresh from context
      await contextRefresh();
      
      success = true;
    } catch (err) {
      console.error('Error refreshing subscription:', err);
      const errorMessage = 'שגיאה בטעינת נתוני המנוי';
      setError(errorMessage);
      toast.error(errorMessage);
      
      if (onError && err instanceof Error) {
        onError(err);
      } else if (onError) {
        onError(new Error(errorMessage));
      }
      
      success = false;
    }
    return success;
  }, [actionsRefresh, contextRefresh, onError]);

  return {
    error,
    refreshSubscription
  };
};
