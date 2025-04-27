
/**
 * Logger class for payment-related operations
 */
export class PaymentLogger {
  private static readonly PREFIX = '[PAYMENT]';
  private static readonly DEBUG = true;

  /**
   * Log an informational message
   */
  static log(message: string, data?: any): void {
    if (this.DEBUG) {
      if (data) {
        console.log(`${this.PREFIX} ${message}`, data);
      } else {
        console.log(`${this.PREFIX} ${message}`);
      }
    }
  }

  /**
   * Log an error message
   */
  static error(message: string, error?: any): void {
    if (error) {
      console.error(`${this.PREFIX} ${message}`, error);
    } else {
      console.error(`${this.PREFIX} ${message}`);
    }
  }

  /**
   * Log a warning message
   */
  static warn(message: string, data?: any): void {
    if (this.DEBUG) {
      if (data) {
        console.warn(`${this.PREFIX} ${message}`, data);
      } else {
        console.warn(`${this.PREFIX} ${message}`);
      }
    }
  }

  /**
   * Clear all payment related logs from the console
   */
  static clearLogs(): void {
    console.clear();
  }
}
