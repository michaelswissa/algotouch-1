
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
      // Store logs in a payment_logs table
      const { error } = await supabase
        .from('payment_logs')
        .insert({
          level: logEntry.level,
          message: logEntry.message,
          context: logEntry.context,
          payment_data: logEntry.data || {},
          user_id: logEntry.userId,
          transaction_id: logEntry.transactionId || 'none',
          session_id: logEntry.sessionId,
          source: logEntry.source
        });

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
