
import { supabase } from '@/lib/supabase-client';

type LogLevel = 'info' | 'warning' | 'error' | 'success' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  context: string;
  data?: any;
  userId?: string;
  timestamp: string;
  sessionId?: string; 
  transactionId?: string;
  source: string;
}

export class PaymentLogger {
  private static readonly MAX_RETRIES = 3;

  /**
   * Log payment-related events
   */
  static async log(
    level: LogLevel,
    message: string,
    context: string,
    data?: any,
    userId?: string,
    transactionId?: string
  ): Promise<void> {
    const logEntry: LogEntry = {
      level,
      message,
      context,
      data,
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString(),
      transactionId,
      sessionId: generateSessionId(),
      source: 'client'
    };

    // Always log to console for development/debugging
    this.logToConsole(logEntry);

    // Attempt to store in database
    await this.storeLog(logEntry);
  }

  /**
   * Log payment info events
   */
  static async info(
    message: string, 
    context: string, 
    data?: any, 
    userId?: string, 
    transactionId?: string
  ): Promise<void> {
    return this.log('info', message, context, data, userId, transactionId);
  }

  /**
   * Log payment error events
   */
  static async error(
    message: string, 
    context: string, 
    data?: any, 
    userId?: string, 
    transactionId?: string
  ): Promise<void> {
    return this.log('error', message, context, data, userId, transactionId);
  }

  /**
   * Log payment success events
   */
  static async success(
    message: string, 
    context: string, 
    data?: any, 
    userId?: string, 
    transactionId?: string
  ): Promise<void> {
    return this.log('success', message, context, data, userId, transactionId);
  }

  /**
   * Log payment warning events
   */
  static async warning(
    message: string, 
    context: string, 
    data?: any, 
    userId?: string, 
    transactionId?: string
  ): Promise<void> {
    return this.log('warning', message, context, data, userId, transactionId);
  }

  /**
   * Store log entries in Supabase database
   */
  private static async storeLog(logEntry: LogEntry): Promise<void> {
    try {
      // Map our logEntry to the structure expected by the payment_logs table
      const dbEntry = {
        payment_status: logEntry.level,
        user_id: logEntry.userId,
        transaction_id: logEntry.transactionId || 'none',
        payment_data: {
          message: logEntry.message,
          context: logEntry.context,
          details: logEntry.data || {},
          session_id: logEntry.sessionId,
          source: logEntry.source,
          level: logEntry.level
        },
        // These are placeholder values that are needed by the database schema
        amount: 0, // Using 0 for log entries that don't represent actual payments
        plan_id: 'system_log', // Using 'system_log' for log entries that don't relate to a specific plan
        currency: 'N/A'
      };

      // Store logs in a payment_logs table
      const { error } = await supabase
        .from('payment_logs')
        .insert(dbEntry);

      if (error) {
        console.error('Failed to store payment log:', error);
      }
    } catch (error) {
      console.error('Exception storing payment log:', error);
    }
  }

  /**
   * Format and output logs to console
   */
  private static logToConsole(logEntry: LogEntry): void {
    const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
    const prefix = `[PAYMENT ${logEntry.level.toUpperCase()}] [${timestamp}] [${logEntry.context}]`;
    
    switch (logEntry.level) {
      case 'error':
        console.error(`${prefix} ${logEntry.message}`, logEntry.data || '');
        break;
      case 'warning':
        console.warn(`${prefix} ${logEntry.message}`, logEntry.data || '');
        break;
      case 'success':
        console.log(`%c${prefix} ${logEntry.message}`, 'color: green', logEntry.data || '');
        break;
      case 'info':
        console.info(`${prefix} ${logEntry.message}`, logEntry.data || '');
        break;
      case 'debug':
        console.debug(`${prefix} ${logEntry.message}`, logEntry.data || '');
        break;
    }
  }
}

/**
 * Generate a unique session ID for tracking logs across a payment flow
 */
function generateSessionId(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}
