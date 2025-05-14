
import { supabase } from '@/integrations/supabase/client';
import { ActionResult } from '../types';
import { logError } from '@/services/errors/utils/errorTracking';

interface CancelSubscriptionParams {
  userId: string;
  subscriptionId: string;
  reason: string;
  feedback?: string;
}

/**
 * Cancels a user's subscription
 */
export const cancelSubscription = async ({
  userId,
  subscriptionId,
  reason,
  feedback
}: CancelSubscriptionParams): Promise<ActionResult<boolean>> => {
  try {
    if (!userId || !subscriptionId) {
      throw new Error('לא ניתן לבטל מנוי, אנא התחבר מחדש');
    }
    
    const { error } = await supabase.functions.invoke('cancel-subscription', {
      body: {
        subscriptionId,
        userId,
        reason,
        feedback
      }
    });
    
    if (error) {
      throw new Error(`אירעה שגיאה בביטול המנוי: ${error.message}`);
    }
    
    return {
      success: true,
      message: 'המנוי בוטל בהצלחה'
    };
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    
    // Log the error to our tracking system
    await logError({
      category: 'subscription',
      action: 'cancel',
      error,
      userId,
      metadata: { subscriptionId }
    });
    
    // Return error result
    return {
      success: false,
      error,
      message: error.message || 'אירעה שגיאה בביטול המנוי'
    };
  }
};
