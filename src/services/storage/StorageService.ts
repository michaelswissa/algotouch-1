
/**
 * Service for managing storage of registration and subscription data
 */
export class StorageService {
  private static REGISTRATION_DATA_KEY = 'registration_data';
  private static CONTRACT_DATA_KEY = 'contract_data';
  private static PAYMENT_SESSION_KEY = 'payment_session';

  /**
   * Get registration data from session storage
   */
  static getRegistrationData(): any {
    try {
      const data = sessionStorage.getItem(this.REGISTRATION_DATA_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting registration data:', error);
      return {};
    }
  }

  /**
   * Store registration data to session storage
   */
  static storeRegistrationData(data: any): void {
    try {
      // Ensure data has a timestamp if not present
      if (!data.registrationTime) {
        data.registrationTime = new Date().toISOString();
      }
      
      sessionStorage.setItem(this.REGISTRATION_DATA_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error storing registration data:', error);
    }
  }

  /**
   * Update registration data (preserves existing fields)
   */
  static updateRegistrationData(newData: any): any {
    try {
      const currentData = this.getRegistrationData();
      const updatedData = { ...currentData, ...newData };
      this.storeRegistrationData(updatedData);
      return updatedData;
    } catch (error) {
      console.error('Error updating registration data:', error);
      return newData;
    }
  }

  /**
   * Get contract data from session storage
   */
  static getContractData(): any {
    try {
      const data = sessionStorage.getItem(this.CONTRACT_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting contract data:', error);
      return null;
    }
  }

  /**
   * Store contract data to session storage
   */
  static storeContractData(data: any): void {
    try {
      sessionStorage.setItem(this.CONTRACT_DATA_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error storing contract data:', error);
    }
  }

  /**
   * Store payment session data
   */
  static storePaymentSessionData(data: any): void {
    try {
      sessionStorage.setItem(this.PAYMENT_SESSION_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error storing payment session data:', error);
    }
  }

  /**
   * Get payment session data
   */
  static getPaymentSessionData(): any {
    try {
      const data = sessionStorage.getItem(this.PAYMENT_SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting payment session data:', error);
      return null;
    }
  }

  /**
   * Clear all subscription-related data from storage
   */
  static clearAllSubscriptionData(): void {
    try {
      sessionStorage.removeItem(this.REGISTRATION_DATA_KEY);
      sessionStorage.removeItem(this.CONTRACT_DATA_KEY);
      sessionStorage.removeItem(this.PAYMENT_SESSION_KEY);
    } catch (error) {
      console.error('Error clearing subscription data:', error);
    }
  }
}
