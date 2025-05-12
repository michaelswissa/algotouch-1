
import { supabase } from '@/lib/supabase-client';

export class PaymentDebugger {
  /**
   * Get complete payment flow for a transaction
   */
  static async getTransactionFlow(transactionId: string): Promise<any[]> {
    try {
      const { data: logs, error } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching payment flow:', error);
        return [];
      }

      return logs || [];
    } catch (error) {
      console.error('Exception fetching payment flow:', error);
      return [];
    }
  }

  /**
   * Get session payment flow
   */
  static async getSessionFlow(sessionId: string): Promise<any[]> {
    try {
      const { data: logs, error } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching session flow:', error);
        return [];
      }

      return logs || [];
    } catch (error) {
      console.error('Exception fetching session flow:', error);
      return [];
    }
  }

  /**
   * Get user payment history
   */
  static async getUserPayments(userId: string): Promise<any[]> {
    try {
      const { data: logs, error } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('level', 'success')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user payments:', error);
        return [];
      }

      return logs || [];
    } catch (error) {
      console.error('Exception fetching user payments:', error);
      return [];
    }
  }

  /**
   * Get recent payment errors
   */
  static async getRecentErrors(limit: number = 10): Promise<any[]> {
    try {
      const { data: logs, error } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('level', 'error')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent errors:', error);
        return [];
      }

      return logs || [];
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
      const { data: errorLogs, error } = await supabase
        .from('payment_logs')
        .select('message, count(*)')
        .eq('level', 'error')
        .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .group('message')
        .order('count', { ascending: false });

      if (error) {
        console.error('Error analyzing errors:', error);
        return {};
      }

      return errorLogs || [];
    } catch (error) {
      console.error('Exception analyzing errors:', error);
      return {};
    }
  }
}
