
import { supabase } from '@/integrations/supabase/client';
import { Subscription, ActionResult } from '../types';
import { logError } from '@/services/errors/utils/errorTracking';

interface CheckSubscriptionStatusParams {
  userId: string;
}

/**
 * Checks a user's subscription status
 */
export const checkSubscriptionStatus = async ({
  userId
}: CheckSubscriptionStatusParams): Promise<ActionResult<Subscription | null>> => {
  try {
    if (!userId) {
      throw new Error('לא ניתן לבדוק סטטוס מנוי, אנא התחבר מחדש');
    }
    
    // Use maybeSingle instead of single to avoid errors if no subscription exists
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (error) {
      throw new Error(`שגיאה בבדיקת מנוי: ${error.message}`);
    }
    
    return {
      success: true,
      data: data as Subscription | null
    };
  } catch (error: any) {
    console.error('Error checking subscription status:', error);
    
    // Log the error to our tracking system
    await logError({
      category: 'subscription',
      action: 'check-status',
      error,
      userId
    });
    
    return {
      success: false,
      error,
      message: error.message || 'שגיאה בבדיקת סטטוס מנוי'
    };
  }
};
