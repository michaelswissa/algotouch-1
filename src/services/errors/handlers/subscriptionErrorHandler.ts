
import { toast } from 'sonner';
import { logError } from '../utils/errorTracking';

/**
 * Handles subscription errors
 */
export const handleSubscriptionError = async (
  error: any, 
  userId?: string,
  context: string = 'subscription',
  options?: {
    showToast?: boolean;
    redirectTo?: string;
    onError?: (error: any) => void;
  }
): Promise<any> => {
  const showToast = options?.showToast ?? true;
  const errorMessage = error.message || 'שגיאה בטיפול במנוי';
  
  // Log the error
  await logError({
    category: 'subscription',
    action: context,
    error,
    userId
  });
  
  // Show toast notification if enabled
  if (showToast) {
    toast.error(errorMessage);
  }
  
  // Redirect if specified
  if (options?.redirectTo) {
    setTimeout(() => {
      window.location.href = options.redirectTo!;
    }, 1500);
  }
  
  // Call custom error handler if provided
  if (options?.onError) {
    options.onError(error);
  }
  
  return {
    success: false,
    error,
    message: errorMessage
  };
};
