
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
      return (logs || []).map(log => this.mapDbLogToUiLog(log as PaymentLogDB));
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

      return (logs || []).map(log => this.mapDbLogToUiLog(log as PaymentLogDB));
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

      return (logs || []).map(log => this.mapDbLogToUiLog(log as PaymentLogDB));
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

      return (logs || []).map(log => this.mapDbLogToUiLog(log as PaymentLogDB));
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
      // Using direct SQL function call instead of RPC
      const { data, error } = await supabase
        .from('payment_logs')
        .select('payment_data->message as message')
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
        const message = item.message || 'Unknown error';
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
  private static mapDbLogToUiLog(dbLog: PaymentLogDB): PaymentLog {
    // Create a safe accessor for the payment_data JSON field
    const getPaymentData = (log: PaymentLogDB) => {
      const data = log.payment_data || {};
      return typeof data === 'object' ? data : {};
    };
    
    const paymentData = getPaymentData(dbLog);
    
    return {
      id: dbLog.id,
      level: paymentData.level ? String(paymentData.level) : dbLog.payment_status || 'info',
      message: paymentData.message ? String(paymentData.message) : 'Payment log entry',
      context: paymentData.context ? String(paymentData.context) : 'payment-system',
      payment_data: paymentData.details || paymentData,
      user_id: dbLog.user_id,
      transaction_id: dbLog.transaction_id,
      created_at: dbLog.created_at,
      session_id: paymentData.session_id ? String(paymentData.session_id) : undefined,
      source: paymentData.source ? String(paymentData.source) : 'system'
    };
  }
}
