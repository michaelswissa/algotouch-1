
import { supabase } from '@/integrations/supabase/client';
import { CancellationData, ActionResult } from '../types';
import { logError } from '@/services/errors/utils/errorTracking';

interface FetchCancellationDataParams {
  subscriptionId: string;
}

/**
 * Fetches cancellation data for a subscription
 */
export const fetchCancellationData = async ({
  subscriptionId
}: FetchCancellationDataParams): Promise<ActionResult<CancellationData | null>> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-cancellation-data', {
      body: { subscriptionId }
    });
    
    if (error) {
      throw new Error(`שגיאה בשליפת נתוני ביטול: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      return { success: true, data: null };
    }
    
    return {
      success: true,
      data: {
        reason: data[0].reason,
        feedback: data[0].feedback
      }
    };
  } catch (error: any) {
    console.error('Error fetching cancellation data:', error);
    
    // Log the error to our tracking system
    await logError({
      category: 'subscription',
      action: 'fetch-cancellation',
      error,
      metadata: { subscriptionId }
    });
    
    return {
      success: false,
      error,
      message: error.message || 'שגיאה בשליפת נתוני ביטול'
    };
  }
};
