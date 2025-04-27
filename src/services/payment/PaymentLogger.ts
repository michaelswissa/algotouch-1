
export class PaymentLogger {
  private static readonly PREFIX = '[PAYMENT]';

  /**
   * Log general payment information
   */
  static log(message: string, data?: any): void {
    if (data) {
      console.log(`${this.PREFIX} ${message}`, data);
    } else {
      console.log(`${this.PREFIX} ${message}`);
    }
  }

  /**
   * Log payment errors
   */
  static error(message: string, error?: any): void {
    if (error instanceof Error) {
      console.error(`${this.PREFIX} ERROR: ${message}`, error.message);
    } else if (error) {
      console.error(`${this.PREFIX} ERROR: ${message}`, error);
    } else {
      console.error(`${this.PREFIX} ERROR: ${message}`);
    }
  }

  /**
   * Log payment status changes
   */
  static logStatus(fromStatus: string, toStatus: string): void {
    console.log(`${this.PREFIX} Status change: ${fromStatus} -> ${toStatus}`);
  }

  /**
   * Log payment initialization
   */
  static logInitialization(planId: string, data?: any): void {
    console.log(`${this.PREFIX} Initializing payment for plan: ${planId}`, data || '');
  }

  /**
   * Log payment success
   */
  static logSuccess(planId: string, data?: any): void {
    console.log(`${this.PREFIX} Payment successful for plan: ${planId}`, data || '');
  }

  /**
   * Log payment failure
   */
  static logFailure(planId: string, error?: any): void {
    if (error instanceof Error) {
      console.error(`${this.PREFIX} Payment failed for plan: ${planId}`, error.message);
    } else if (error) {
      console.error(`${this.PREFIX} Payment failed for plan: ${planId}`, error);
    } else {
      console.error(`${this.PREFIX} Payment failed for plan: ${planId}`);
    }
  }
}
