
/**
 * Service for managing browser storage
 */
export class StorageService {
  // Keys for different storage items
  private static readonly PAYMENT_DATA_KEY = 'payment_data';
  private static readonly REGISTRATION_DATA_KEY = 'registration_data';
  private static readonly REGISTRATION_INTENT_KEY = 'registration_intent';
  private static readonly CONTRACT_DATA_KEY = 'contract_data';

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
   * Check if registration data is valid (not expired)
   */
  static isRegistrationValid(): boolean {
    try {
      const data = this.getRegistrationData();
      if (!data || !data.timestamp) return false;
      
      // Registration data valid for 30 minutes
      const expiryTime = new Date(data.timestamp).getTime() + (30 * 60 * 1000);
      return new Date().getTime() < expiryTime;
    } catch (error) {
      console.error("Error checking registration validity:", error);
      return false;
    }
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
   * Store contract data
   */
  static storeContractData(data: any): void {
    sessionStorage.setItem(this.CONTRACT_DATA_KEY, JSON.stringify({
      ...data,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Get contract data
   */
  static getContractData(): any {
    const data = sessionStorage.getItem(this.CONTRACT_DATA_KEY);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Clear registration data
   */
  static clearRegistrationData(): void {
    sessionStorage.removeItem(this.REGISTRATION_DATA_KEY);
    sessionStorage.removeItem(this.REGISTRATION_INTENT_KEY);
  }

  /**
   * Clear all subscription related data
   */
  static clearAllSubscriptionData(): void {
    this.clearPaymentData();
    this.clearRegistrationData();
    sessionStorage.removeItem(this.CONTRACT_DATA_KEY);
  }
}
