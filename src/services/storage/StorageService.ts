
/**
 * Service for handling localStorage and sessionStorage operations
 */
export class StorageService {
  // Registration data
  static setRegistrationData(data: any): void {
    try {
      sessionStorage.setItem('registration_data', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving registration data to session storage:', error);
    }
  }

  static getRegistrationData(): any | null {
    try {
      const data = sessionStorage.getItem('registration_data');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading registration data from session storage:', error);
      return null;
    }
  }

  // Contract data
  static setContractData(data: any): void {
    try {
      sessionStorage.setItem('contract_data', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving contract data to session storage:', error);
    }
  }

  static getContractData(): any | null {
    try {
      const data = sessionStorage.getItem('contract_data');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading contract data from session storage:', error);
      return null;
    }
  }

  // User ID
  static setUserId(userId: string): void {
    try {
      sessionStorage.setItem('userId', userId);
    } catch (error) {
      console.error('Error saving user ID to session storage:', error);
    }
  }

  static getUserId(): string | null {
    try {
      return sessionStorage.getItem('userId');
    } catch (error) {
      console.error('Error reading user ID from session storage:', error);
      return null;
    }
  }

  // Payment session data
  static setPaymentSessionData(data: any): void {
    try {
      sessionStorage.setItem('payment_session', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving payment session to session storage:', error);
    }
  }

  static getPaymentSessionData(): any | null {
    try {
      const data = sessionStorage.getItem('payment_session');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading payment session from session storage:', error);
      return null;
    }
  }

  // Clear all payment related data
  static clearPaymentData(): void {
    try {
      sessionStorage.removeItem('payment_session');
    } catch (error) {
      console.error('Error clearing payment data from session storage:', error);
    }
  }
}
