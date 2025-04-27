
// Helper service for storing and retrieving data from localStorage
export class StorageService {
  // Subscription data keys
  private static readonly SUBSCRIPTION_DATA_KEY = 'subscription_data';
  private static readonly CONTRACT_DATA_KEY = 'contract_data';
  private static readonly REGISTRATION_DATA_KEY = 'registration_data';
  private static readonly USER_ID_KEY = 'userId';
  private static readonly LAST_PAYMENT_ATTEMPT_KEY = 'last_payment_attempt';

  // Store subscription data
  static storeSubscriptionData(data: any) {
    try {
      localStorage.setItem(this.SUBSCRIPTION_DATA_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Error storing subscription data', e);
      return false;
    }
  }

  // Get subscription data
  static getSubscriptionData(): any | null {
    try {
      const data = localStorage.getItem(this.SUBSCRIPTION_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error getting subscription data', e);
      return null;
    }
  }

  // Store contract data
  static storeContractData(data: any) {
    try {
      localStorage.setItem(this.CONTRACT_DATA_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Error storing contract data', e);
      return false;
    }
  }

  // Get contract data
  static getContractData(): any | null {
    try {
      const data = localStorage.getItem(this.CONTRACT_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error getting contract data', e);
      return null;
    }
  }

  // Store registration data
  static storeRegistrationData(data: any) {
    try {
      localStorage.setItem(this.REGISTRATION_DATA_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Error storing registration data', e);
      return false;
    }
  }

  // Get registration data
  static getRegistrationData(): any | null {
    try {
      const data = localStorage.getItem(this.REGISTRATION_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error getting registration data', e);
      return null;
    }
  }

  // Check if registration data is valid
  static isRegistrationValid(): boolean {
    try {
      const data = this.getRegistrationData();
      if (!data) return false;
      
      // Check basic validity criteria
      if (!data.email || !data.userData) return false;
      
      // If planId is present but no contractSigned - invalid state
      if (data.planId && data.contractSigned !== true) return false;
      
      return true;
    } catch (e) {
      console.error('Error checking registration validity', e);
      return false;
    }
  }

  // Store user ID
  static storeUserId(userId: string) {
    try {
      localStorage.setItem(this.USER_ID_KEY, userId);
      return true;
    } catch (e) {
      console.error('Error storing user ID', e);
      return false;
    }
  }

  // Get user ID
  static getUserId(): string | null {
    return localStorage.getItem(this.USER_ID_KEY);
  }

  // Store last payment attempt
  static storeLastPaymentAttempt(data: any) {
    try {
      localStorage.setItem(this.LAST_PAYMENT_ATTEMPT_KEY, JSON.stringify({
        ...data,
        timestamp: Date.now()
      }));
      return true;
    } catch (e) {
      console.error('Error storing last payment attempt', e);
      return false;
    }
  }

  // Get last payment attempt
  static getLastPaymentAttempt(): any | null {
    try {
      const data = localStorage.getItem(this.LAST_PAYMENT_ATTEMPT_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error getting last payment attempt', e);
      return null;
    }
  }

  // Clear all subscription-related data
  static clearAllSubscriptionData() {
    try {
      localStorage.removeItem(this.SUBSCRIPTION_DATA_KEY);
      localStorage.removeItem(this.CONTRACT_DATA_KEY);
      localStorage.removeItem(this.REGISTRATION_DATA_KEY);
      localStorage.removeItem(this.LAST_PAYMENT_ATTEMPT_KEY);
      // Don't remove user ID here as it might be needed for other features
      return true;
    } catch (e) {
      console.error('Error clearing subscription data', e);
      return false;
    }
  }

  // Clear everything including user ID
  static clearEverything() {
    try {
      localStorage.clear();
      return true;
    } catch (e) {
      console.error('Error clearing localStorage', e);
      return false;
    }
  }
}
