
/**
 * Logger service for payment-related operations
 */
export class PaymentLogger {
  private static isDebugEnabled = process.env.NODE_ENV === 'development' || localStorage.getItem('debug_payments') === 'true';
  
  /**
   * Log an informational message
   */
  static log(message: string, data?: any): void {
    if (this.isDebugEnabled) {
      if (data) {
        console.log(`[PAYMENT] ${message}`, data);
      } else {
        console.log(`[PAYMENT] ${message}`);
      }
    }
  }
  
  /**
   * Log a warning message
   */
  static warn(message: string, data?: any): void {
    if (this.isDebugEnabled) {
      if (data) {
        console.warn(`[PAYMENT WARNING] ${message}`, data);
      } else {
        console.warn(`[PAYMENT WARNING] ${message}`);
      }
    }
  }
  
  /**
   * Log an error message
   */
  static error(message: string, error?: any): void {
    if (error) {
      console.error(`[PAYMENT ERROR] ${message}`, error);
    } else {
      console.error(`[PAYMENT ERROR] ${message}`);
    }
    
    // Optionally send error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Implement error reporting here if needed
    }
  }
  
  /**
   * Enable debug logging
   */
  static enableDebug(): void {
    localStorage.setItem('debug_payments', 'true');
    this.isDebugEnabled = true;
    console.log('[PAYMENT] Debug logging enabled');
  }
  
  /**
   * Disable debug logging
   */
  static disableDebug(): void {
    localStorage.removeItem('debug_payments');
    this.isDebugEnabled = process.env.NODE_ENV === 'development';
    console.log('[PAYMENT] Debug logging disabled');
  }
}
