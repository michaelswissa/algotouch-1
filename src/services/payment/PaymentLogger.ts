
/**
 * Logging service for payment operations with structured logs
 * and client-side persistence for debugging
 */
export class PaymentLogger {
  private static readonly MAX_LOGS = 100;
  private static readonly STORAGE_KEY = 'payment_logs';
  
  /**
   * Log an informational message with optional data
   */
  static log(message: string, data?: any): void {
    const entry = this.createLogEntry('info', message, data);
    this.saveLog(entry);
    console.log(`[PAYMENT] ${message}`, data || '');
  }
  
  /**
   * Log an error message with optional error object
   */
  static error(message: string, error?: any): void {
    const entry = this.createLogEntry('error', message, error);
    this.saveLog(entry);
    console.error(`[PAYMENT ERROR] ${message}`, error || '');
  }
  
  /**
   * Log a warning message with optional data
   */
  static warn(message: string, data?: any): void {
    const entry = this.createLogEntry('warn', message, data);
    this.saveLog(entry);
    console.warn(`[PAYMENT WARNING] ${message}`, data || '');
  }
  
  /**
   * Create a log entry with timestamp and metadata
   */
  private static createLogEntry(level: 'info' | 'error' | 'warn', message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: data ? this.sanitizeData(data) : undefined
    };
  }
  
  /**
   * Sanitize sensitive data before logging
   */
  private static sanitizeData(data: any): any {
    if (!data) return undefined;
    
    // Create a deep copy to avoid mutating the original
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Remove sensitive fields
    if (sanitized.cardNumber) sanitized.cardNumber = 'XXXX-XXXX-XXXX-' + sanitized.cardNumber.slice(-4);
    if (sanitized.cvv) sanitized.cvv = 'XXX';
    if (sanitized.password) sanitized.password = '[REDACTED]';
    
    return sanitized;
  }
  
  /**
   * Save log entry to session storage
   */
  private static saveLog(entry: LogEntry): void {
    try {
      // Get existing logs
      const existingLogs = this.getLogs();
      
      // Add new entry and limit size
      existingLogs.push(entry);
      if (existingLogs.length > this.MAX_LOGS) {
        existingLogs.shift(); // Remove oldest entry
      }
      
      // Save back to storage
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingLogs));
    } catch (e) {
      console.error('Failed to save payment log:', e);
    }
  }
  
  /**
   * Get all stored logs
   */
  static getLogs(): LogEntry[] {
    try {
      const logsStr = sessionStorage.getItem(this.STORAGE_KEY);
      return logsStr ? JSON.parse(logsStr) : [];
    } catch (e) {
      console.error('Failed to retrieve payment logs:', e);
      return [];
    }
  }
  
  /**
   * Clear all stored logs
   */
  static clearLogs(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
  }
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn';
  message: string;
  data?: any;
}
