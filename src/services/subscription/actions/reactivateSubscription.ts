
import { supabase } from '@/integrations/supabase/client';
import { ActionResult } from '../types';
import { logError } from '@/services/errors/utils/errorTracking';

interface ReactivateSubscriptionParams {
  userId: string;
  subscriptionId: string;
}

/**
 * Reactivates a previously cancelled subscription
 */
export const reactivateSubscription = async ({
  userId,
  subscriptionId
}: ReactivateSubscriptionParams): Promise<ActionResult<boolean>> => {
  try {
    if (!userId || !subscriptionId) {
      throw new Error('לא ניתן להפעיל מחדש את המנוי, אנא התחבר מחדש');
    }
    
    const { error } = await supabase.functions.invoke('reactivate-subscription', {
      body: {
        subscriptionId,
        userId
      }
    });
    
    if (error) {
      throw new Error(`אירעה שגיאה בהפעלה מחדש של המנוי: ${error.message}`);
    }
    
    return {
      success: true,
      message: 'המנוי הופעל מחדש בהצלחה'
    };
  } catch (error: any) {
    console.error('Error reactivating subscription:', error);
    
    // Log the error to our tracking system
    await logError({
      category: 'subscription',
      action: 'reactivate',
      error,
      userId,
      metadata: { subscriptionId }
    });
    
    return {
      success: false,
      error,
      message: error.message || 'אירעה שגיאה בהפעלה מחדש של המנוי'
    };
  }
};
