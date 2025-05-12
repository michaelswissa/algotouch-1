
import { supabase } from '@/lib/supabase-client';
import { PaymentLog, PaymentLogDB } from '@/types/payment-logs';

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
  static async analyzeErrors(): Promise<any> {
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
      
      data?.forEach(item => {
        // Safely extract message from payment_data
        let message = 'Unknown error';
        
        if (item.payment_data && 
            typeof item.payment_data === 'object' && 
            'message' in item.payment_data) {
          const msgData = item.payment_data.message;
          message = typeof msgData === 'string' ? msgData : 'Unknown error';
        }
        
        errorCounts[message] = (errorCounts[message] || 0) + 1;
      });
      
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
   * Map database log format to UI log format
   */
  private static mapDbLogToUiLog(dbLog: any): PaymentLog {
    // Create a safe accessor for the payment_data JSON field
    const paymentData = dbLog.payment_data || {};
    const safePaymentData = typeof paymentData === 'object' ? paymentData : {};
    
    // Safe getter function for JSON properties
    const safeGet = (obj: any, key: string, defaultValue: string): string => {
      if (!obj || typeof obj !== 'object') return defaultValue;
      const val = obj[key];
      return val !== undefined && val !== null ? String(val) : defaultValue;
    };
    
    return {
      id: dbLog.id,
      level: safeGet(safePaymentData, 'level', dbLog.payment_status || 'info'),
      message: safeGet(safePaymentData, 'message', 'Payment log entry'),
      context: safeGet(safePaymentData, 'context', 'payment-system'),
      payment_data: safePaymentData.details || safePaymentData,
      user_id: dbLog.user_id,
      transaction_id: dbLog.transaction_id,
      created_at: dbLog.created_at,
      session_id: safeGet(safePaymentData, 'session_id', undefined),
      source: safeGet(safePaymentData, 'source', 'system')
    };
  }
}
