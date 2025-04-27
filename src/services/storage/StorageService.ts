
/**
 * Service for managing browser storage
 */
export class StorageService {
  // Keys for different storage items
  private static readonly PAYMENT_DATA_KEY = 'payment_data';
  private static readonly REGISTRATION_DATA_KEY = 'registration_data';
  private static readonly REGISTRATION_INTENT_KEY = 'registration_intent';

  /**
   * Get stored payment data
   */
  static getPaymentData(): any {
    const data = sessionStorage.getItem(this.PAYMENT_DATA_KEY);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Update stored payment data
   */
  static updatePaymentData(data: any): void {
    const existingData = this.getPaymentData() || {};
    const updatedData = { ...existingData, ...data, updatedAt: new Date().toISOString() };
    sessionStorage.setItem(this.PAYMENT_DATA_KEY, JSON.stringify(updatedData));
  }

  /**
   * Clear payment data
   */
  static clearPaymentData(): void {
    sessionStorage.removeItem(this.PAYMENT_DATA_KEY);
  }

  /**
   * Store registration data temporarily
   */
  static storeRegistrationData(data: any): void {
    sessionStorage.setItem(this.REGISTRATION_DATA_KEY, JSON.stringify({
      ...data,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Get registration data
   */
  static getRegistrationData(): any {
    const data = sessionStorage.getItem(this.REGISTRATION_DATA_KEY);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Store registration intent - used to track registration after payment completion
   */
  static storeRegistrationIntent(data: any): void {
    sessionStorage.setItem(this.REGISTRATION_INTENT_KEY, JSON.stringify({
      ...data,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Get registration intent
   */
  static getRegistrationIntent(): any {
    const data = sessionStorage.getItem(this.REGISTRATION_INTENT_KEY);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Clear all registration data
   */
  static clearRegistrationData(): void {
    sessionStorage.removeItem(this.REGISTRATION_DATA_KEY);
    sessionStorage.removeItem(this.REGISTRATION_INTENT_KEY);
  }
}
