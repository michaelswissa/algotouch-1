
/**
 * Payment logging service to help with debugging payment flows
 */
export class PaymentLogger {
  private static readonly DEBUG_MODE = true;
  private static readonly LOG_PREFIX = '🔄 PAYMENT';
  private static readonly ERROR_PREFIX = '❌ PAYMENT ERROR';
  private static readonly WARNING_PREFIX = '⚠️ PAYMENT WARNING';
  private static readonly SUCCESS_PREFIX = '✅ PAYMENT SUCCESS';
  
  /**
   * Log informational message
   */
  static log(message: string, data?: any): void {
    if (!this.DEBUG_MODE) return;
    
    if (data) {
      console.log(`${this.LOG_PREFIX}: ${message}`, data);
    } else {
      console.log(`${this.LOG_PREFIX}: ${message}`);
    }
  }
  
  /**
   * Log error message
   */
  static error(message: string, error?: any): void {
    if (error) {
      console.error(`${this.ERROR_PREFIX}: ${message}`, error);
    } else {
      console.error(`${this.ERROR_PREFIX}: ${message}`);
    }
  }
  
  /**
   * Log warning message
   */
  static warn(message: string, data?: any): void {
    if (data) {
      console.warn(`${this.WARNING_PREFIX}: ${message}`, data);
    } else {
      console.warn(`${this.WARNING_PREFIX}: ${message}`);
    }
  }
  
  /**
   * Log success message
   */
  static success(message: string, data?: any): void {
    if (data) {
      console.log(`${this.SUCCESS_PREFIX}: ${message}`, data);
    } else {
      console.log(`${this.SUCCESS_PREFIX}: ${message}`);
    }
  }
  
  /**
   * Create a formatted object with timestamp for logging
   */
  static createLogObject(data: any): any {
    return {
      timestamp: new Date().toISOString(),
      ...data
    };
  }
}
