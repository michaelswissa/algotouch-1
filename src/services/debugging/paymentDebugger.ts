
import { supabase } from '@/lib/supabase-client';
import { PaymentLog } from '@/types/payment-logs';

export class PaymentDebugger {
  /**
   * Get complete payment flow for a transaction
   */
  static async getTransactionFlow(transactionId: string): Promise<PaymentLog[]> {
    try {
      const { data: logs, error } = await supabase
        .from('payment_logs')
        .select('id, user_id, transaction_id, payment_data, created_at, payment_status, amount, currency, plan_id')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching payment flow:', error);
        return [];
      }

      // Map database logs to UI format
      return (logs || []).map(log => this.mapDbLogToUiLog(log));
    } catch (error) {
      console.error('Exception fetching payment flow:', error);
      return [];
    }
  }

  /**
   * Get session payment flow
   */
  static async getSessionFlow(sessionId: string): Promise<PaymentLog[]> {
    try {
      // For session flow, we need to filter by session_id which is inside the payment_data JSON
      const { data: logs, error } = await supabase
        .from('payment_logs')
        .select('id, user_id, transaction_id, payment_data, created_at, payment_status, amount, currency, plan_id')
        .filter('payment_data->session_id', 'eq', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching session flow:', error);
        return [];
      }

      return (logs || []).map(log => this.mapDbLogToUiLog(log));
    } catch (error) {
      console.error('Exception fetching session flow:', error);
      return [];
    }
  }

  /**
   * Get user payment history
   */
  static async getUserPayments(userId: string): Promise<PaymentLog[]> {
    try {
      const { data: logs, error } = await supabase
        .from('payment_logs')
        .select('id, user_id, transaction_id, payment_data, created_at, payment_status, amount, currency, plan_id')
        .eq('user_id', userId)
        .eq('payment_status', 'success')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user payments:', error);
        return [];
      }

      return (logs || []).map(log => this.mapDbLogToUiLog(log));
    } catch (error) {
      console.error('Exception fetching user payments:', error);
      return [];
    }
  }

  /**
   * Get recent payment errors
   */
  static async getRecentErrors(limit: number = 10): Promise<PaymentLog[]> {
    try {
      const { data: logs, error } = await supabase
        .from('payment_logs')
        .select('id, user_id, transaction_id, payment_data, created_at, payment_status, amount, currency, plan_id')
        .eq('payment_status', 'error')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent errors:', error);
        return [];
      }

      return (logs || []).map(log => this.mapDbLogToUiLog(log));
    } catch (error) {
      console.error('Exception fetching recent errors:', error);
      return [];
    }
  }

  /**
   * Analyze common error patterns
   */
  static async analyzeErrors(): Promise<{ message: string; count: number }[]> {
    try {
      // Using direct SQL query to get error messages
      const { data, error } = await supabase
        .from('payment_logs')
        .select('payment_data')
        .eq('payment_status', 'error')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) {
        console.error('Error analyzing errors:', error);
        return [];
      }
      
      // Process the data to count occurrences
      const errorCounts: Record<string, number> = {};
      
      // Safely process payment_data
      if (data && data.length > 0) {
        data.forEach(item => {
          let errorMessage = 'Unknown error';
          
          if (item.payment_data) {
            // Handle both object and string representations
            if (typeof item.payment_data === 'object') {
              const paymentData = item.payment_data as Record<string, unknown>;
              errorMessage = String(paymentData.message || errorMessage);
            } else if (typeof item.payment_data === 'string') {
              try {
                const parsed = JSON.parse(item.payment_data);
                errorMessage = String(parsed.message || errorMessage);
              } catch (e) {
                // If it's not valid JSON, use it as is
                errorMessage = String(item.payment_data).substring(0, 100);
              }
            }
          }
          
          errorCounts[errorMessage] = (errorCounts[errorMessage] || 0) + 1;
        });
      }
      
      // Convert to array of objects sorted by count
      return Object.entries(errorCounts)
        .map(([message, count]) => ({ message, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Exception analyzing errors:', error);
      return [];
    }
  }

  /**
   * Get failed webhooks to retry processing
   */
  static async getFailedWebhooks(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('payment_webhooks')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching failed webhooks:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Exception fetching failed webhooks:', error);
      return [];
    }
  }

  /**
   * Manually process a webhook that failed
   */
  static async retryWebhook(webhookId: string): Promise<boolean> {
    try {
      // Call the process-webhook edge function
      const { error } = await supabase.functions.invoke('process-webhook', {
        body: { webhookId }
      });
      
      if (error) {
        console.error('Error retrying webhook:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception retrying webhook:', error);
      return false;
    }
  }

  /**
   * Find user by email
   */
  static async findUserByEmail(email: string): Promise<{ id: string; email: string | null } | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();
      
      if (error) {
        console.error('Error finding user by email:', error);
        return null;
      }
      
      // If data is null, return null directly
      if (!data) {
        return null;
      }
      
      // Otherwise return the data
      return {
        id: data.id,
        email: data.email
      };
    } catch (error) {
      console.error('Exception finding user by email:', error);
      return null;
    }
  }

  /**
   * Manually create subscription and token for a user
   */
  static async createSubscriptionForUser(userId: string, paymentData: any): Promise<boolean> {
    try {
      // Create subscription record
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          status: 'active',
          payment_method: 'cardcom',
          payment_details: paymentData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (subError) {
        console.error('Error creating subscription:', subError);
        return false;
      }
      
      // If we have token info, create a token record
      if (paymentData?.token_info?.token) {
        // Ensure all required fields are present
        if (!paymentData.token_info.token || !paymentData.token_info.expiry) {
          console.error('Missing required token information', paymentData.token_info);
          return false;
        }
        
        const { error: tokenError } = await supabase
          .from('recurring_payments')
          .insert({
            user_id: userId,
            token: paymentData.token_info.token,
            token_expiry: paymentData.token_info.expiry,
            token_approval_number: paymentData.token_info.approval || '', // Provide empty string if null
            last_4_digits: paymentData.card_info?.last4 || null,
            card_type: paymentData.card_info?.card_type || null,
            status: 'active',
            is_valid: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (tokenError) {
          console.error('Error creating token:', tokenError);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Exception creating subscription:', error);
      return false;
    }
  }

  /**
   * Map database log format to UI log format
   */
  private static mapDbLogToUiLog(dbLog: any): PaymentLog {
    // Create a safe accessor for the payment_data JSON field
    const paymentData = typeof dbLog.payment_data === 'object' && dbLog.payment_data !== null 
      ? dbLog.payment_data 
      : {};
    
    return {
      id: dbLog.id,
      level: this.safeGetValue(paymentData, 'level', dbLog.payment_status || 'info'),
      message: this.safeGetValue(paymentData, 'message', 'Payment log entry'),
      context: this.safeGetValue(paymentData, 'context', 'payment-system'),
      payment_data: paymentData.details || paymentData,
      user_id: dbLog.user_id,
      transaction_id: dbLog.transaction_id,
      created_at: dbLog.created_at,
      session_id: this.safeGetValue(paymentData, 'session_id', undefined),
      source: this.safeGetValue(paymentData, 'source', 'system')
    };
  }
  
  /**
   * Safe getter utility for JSON properties
   */
  private static safeGetValue(obj: any, key: string, defaultValue: any): any {
    if (!obj || typeof obj !== 'object') return defaultValue;
    const val = obj[key];
    return val !== undefined && val !== null ? String(val) : defaultValue;
  }
}
