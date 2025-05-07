
/**
 * Simple logger for payment-related operations
 */
export class PaymentLogger {
  static readonly DEBUG_ENABLED = import.meta.env.DEV || 
    localStorage.getItem('debug_payment') === 'true';
  
  static log(message: string, data?: any): void {
    if (this.DEBUG_ENABLED) {
      if (data) {
        console.log(`[Payment] ${message}`, data);
      } else {
        console.log(`[Payment] ${message}`);
      }
    }
  }
  
  static error(message: string, error?: any): void {
    if (error) {
      console.error(`[Payment Error] ${message}`, error);
    } else {
      console.error(`[Payment Error] ${message}`);
    }
  }
  
  static warn(message: string, data?: any): void {
    if (this.DEBUG_ENABLED) {
      if (data) {
        console.warn(`[Payment Warning] ${message}`, data);
      } else {
        console.warn(`[Payment Warning] ${message}`);
      }
    }
  }
}
