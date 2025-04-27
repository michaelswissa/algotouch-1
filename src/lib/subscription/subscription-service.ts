
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Fetches subscription details for a specific user
 */
export async function fetchUserSubscription(userId: string) {
  if (!userId) {
    console.error("Missing userId for subscription check");
    return { data: null, error: new Error("Missing user ID") };
  }
  
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error("Error fetching subscription:", error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error("Exception fetching subscription:", error);
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Checks if a user has an active subscription
 */
export async function checkActiveSubscription(userId: string): Promise<boolean> {
  if (!userId) return false;
  
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('status, plan_type')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error("Error checking subscription status:", error);
      return false;
    }
    
    return Boolean(data && (
      data.status === 'active' || 
      data.status === 'trial' || 
      data.plan_type === 'vip'
    ));
  } catch (error) {
    console.error("Exception checking subscription status:", error);
    return false;
  }
}

/**
 * Cancels a user's subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('cardcom-recurring', {
      body: { 
        action: 'cancel', 
        subscriptionId 
      }
    });

    if (error) {
      console.error("Error cancelling subscription:", error);
      return { 
        success: false, 
        message: error.message || "Failed to cancel subscription" 
      };
    }

    if (!data?.success) {
      return { 
        success: false, 
        message: data?.message || "Failed to cancel subscription" 
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Exception cancelling subscription:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
