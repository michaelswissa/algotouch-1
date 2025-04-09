
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionMetrics {
  activeSubscriptions: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  conversionRate: number;
  averageSubscriptionAge: number;
  revenueMetrics: {
    monthly: number;
    annual: number;
    vip: number;
    total: number;
    currency: string;
  };
}

/**
 * Fetches general subscription metrics for an admin dashboard
 */
export async function getSubscriptionMetrics(): Promise<{ 
  success: boolean; 
  data?: SubscriptionMetrics;
  error?: any;
}> {
  try {
    // In a real implementation, this would query the database
    // For now, we'll simulate metrics data
    
    const metrics: SubscriptionMetrics = {
      activeSubscriptions: 156,
      trialSubscriptions: 42,
      cancelledSubscriptions: 18,
      conversionRate: 68.5,
      averageSubscriptionAge: 87, // days
      revenueMetrics: {
        monthly: 3564,
        annual: 15921,
        vip: 6998,
        total: 26483,
        currency: 'USD'
      }
    };
    
    return { success: true, data: metrics };
  } catch (error) {
    console.error('Error fetching subscription metrics:', error);
    return { success: false, error };
  }
}

/**
 * Fetches user subscription activity for personalized analytics
 */
export async function getUserSubscriptionActivity(userId: string): Promise<{
  success: boolean;
  data?: {
    loginCount: number;
    featureUsage: Record<string, number>;
    lastActive: string;
    subscriptionAge: number; // days
    nextBillingDate: string;
    paymentHistory: Array<{
      date: string;
      amount: number;
      currency: string;
      status: string;
    }>;
  };
  error?: any;
}> {
  try {
    // Fetch user login activity
    const { data: authData, error: authError } = await supabase
      .from('auth_activity')
      .select('count(*)')
      .eq('user_id', userId);
      
    if (authError) throw authError;
    
    // Fetch payment history
    const { data: paymentData, error: paymentError } = await supabase
      .from('payment_history')
      .select('*')
      .eq('user_id', userId)
      .order('payment_date', { ascending: false });
      
    if (paymentError) throw paymentError;
    
    // For now, we'll combine real and simulated data
    const activityData = {
      loginCount: authData ? authData.length : 12,
      featureUsage: {
        'dashboard': 45,
        'analysis': 23,
        'reports': 16,
        'settings': 8
      },
      lastActive: new Date().toISOString(),
      subscriptionAge: 67, // days
      nextBillingDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
      paymentHistory: paymentData || [
        {
          date: new Date().toISOString(),
          amount: 99,
          currency: 'USD',
          status: 'completed'
        }
      ]
    };
    
    return { success: true, data: activityData };
  } catch (error) {
    console.error('Error fetching user subscription activity:', error);
    return { success: false, error };
  }
}

/**
 * Records a feature usage event for analytics
 */
export async function recordFeatureUsage(
  userId: string,
  featureName: string
): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('Recording feature usage:', {
      userId,
      featureName
    });
    
    // In a real implementation, this would add a record to the database
    // For now, we just log it
    
    return { success: true };
  } catch (error) {
    console.error('Error recording feature usage:', error);
    return { success: false, error };
  }
}
