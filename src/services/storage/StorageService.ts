
/**
 * Service for handling local storage operations
 */
export class StorageService {
  // Keys used in storage
  private static readonly REGISTRATION_KEY = 'registration_data';
  private static readonly CONTRACT_KEY = 'contract_data';
  private static readonly PAYMENT_KEY = 'payment_data';
  private static readonly USER_ID_KEY = 'userId';
  
  /**
   * Get registration data from storage
   */
  static getRegistrationData(): any | null {
    try {
      const data = sessionStorage.getItem(this.REGISTRATION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error parsing registration data', e);
      return null;
    }
  }
  
  /**
   * Store registration data to storage
   */
  static storeRegistrationData(data: any): boolean {
    try {
      const existingData = this.getRegistrationData() || {};
      const updatedData = { ...existingData, ...data };
      sessionStorage.setItem(this.REGISTRATION_KEY, JSON.stringify(updatedData));
      return true;
    } catch (e) {
      console.error('Error storing registration data', e);
      return false;
    }
  }
  
  /**
   * Check if registration data is valid (not expired)
   */
  static isRegistrationValid(): boolean {
    try {
      const data = this.getRegistrationData();
      if (!data || !data.registrationTime) {
        return false;
      }
      
      // Check if registration is expired (30 minutes)
      const registrationTime = new Date(data.registrationTime);
      const now = new Date();
      const timeDiffMinutes = (now.getTime() - registrationTime.getTime()) / (1000 * 60);
      
      return timeDiffMinutes <= 30;
    } catch (e) {
      console.error('Error checking registration validity', e);
      return false;
    }
  }
  
  /**
   * Get contract data from storage
   */
  static getContractData(): any | null {
    try {
      const data = sessionStorage.getItem(this.CONTRACT_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error parsing contract data', e);
      return null;
    }
  }
  
  /**
   * Store contract data to storage
   */
  static storeContractData(data: any): boolean {
    try {
      const existingData = this.getContractData() || {};
      const updatedData = { ...existingData, ...data };
      sessionStorage.setItem(this.CONTRACT_KEY, JSON.stringify(updatedData));
      return true;
    } catch (e) {
      console.error('Error storing contract data', e);
      return false;
    }
  }
  
  /**
   * Get payment data from storage
   */
  static getPaymentData(): any | null {
    try {
      const data = localStorage.getItem(this.PAYMENT_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error parsing payment data', e);
      return null;
    }
  }
  
  /**
   * Update payment data in storage
   */
  static updatePaymentData(data: any): void {
    try {
      const existingData = this.getPaymentData() || {};
      const updatedData = { ...existingData, ...data, updatedAt: new Date().toISOString() };
      localStorage.setItem(this.PAYMENT_KEY, JSON.stringify(updatedData));
    } catch (e) {
      console.error('Error updating payment data', e);
    }
  }
  
  /**
   * Get user ID from storage
   */
  static getUserId(): string | null {
    return sessionStorage.getItem(this.USER_ID_KEY);
  }
  
  /**
   * Set user ID in storage
   */
  static setUserId(userId: string): void {
    sessionStorage.setItem(this.USER_ID_KEY, userId);
  }
  
  /**
   * Clear payment data from storage
   */
  static clearPaymentData(): void {
    localStorage.removeItem(this.PAYMENT_KEY);
  }
  
  /**
   * Clear all subscription-related data (registration, contract, payment)
   */
  static clearAllSubscriptionData(): void {
    sessionStorage.removeItem(this.REGISTRATION_KEY);
    sessionStorage.removeItem(this.CONTRACT_KEY);
    localStorage.removeItem(this.PAYMENT_KEY);
  }
}
