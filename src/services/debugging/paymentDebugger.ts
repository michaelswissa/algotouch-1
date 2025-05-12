
import { supabase } from '@/lib/supabase-client';
import { PaymentLog, PaymentLogDB } from '@/types/payment-logs';

export class PaymentDebugger {
  /**
   * Get complete payment flow for a transaction
   */
  static async getTransactionFlow(transactionId: string): Promise<PaymentLog[]> {
    try {
      const { data: logs, error } = await supabase
        .from<PaymentLogDB>('payment_logs')
        .select('id, user_id, transaction_id, payment_data, created_at, payment_status')
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
        .from<PaymentLogDB>('payment_logs')
        .select('id, user_id, transaction_id, payment_data, created_at, payment_status')
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
        .from<PaymentLogDB>('payment_logs')
        .select('id, user_id, transaction_id, payment_data, created_at, payment_status')
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
        .from<PaymentLogDB>('payment_logs')
        .select('id, user_id, transaction_id, payment_data, created_at, payment_status')
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
      // Using RPC call instead of .group() which is not supported
      const { data, error } = await supabase.rpc('analyze_payment_errors');
      
      if (error) {
        console.error('Error analyzing errors:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Exception analyzing errors:', error);
      return [];
    }
  }

  /**
   * Map database log format to UI log format
   */
  private static mapDbLogToUiLog(dbLog: PaymentLogDB): PaymentLog {
    const paymentData = dbLog.payment_data || {};
    
    return {
      id: dbLog.id,
      level: paymentData.level || dbLog.payment_status || 'info',
      message: paymentData.message || 'Payment log entry',
      context: paymentData.context || 'payment-system',
      payment_data: paymentData.details || paymentData,
      user_id: dbLog.user_id,
      transaction_id: dbLog.transaction_id,
      created_at: dbLog.created_at,
      session_id: paymentData.session_id,
      source: paymentData.source || 'system'
    };
  }
}
