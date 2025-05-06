
import { RegistrationData } from '@/types/auth';
import { toast } from 'sonner';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

export const StorageKeys = {
  REGISTRATION: 'registration_data',
  CONTRACT: 'contract_data',
  PAYMENT: 'payment_data',
} as const;

export class AuthStorageService {
  /**
   * Get registration data from session storage
   */
  static getRegistrationData(): RegistrationData | null {
    try {
      const data = sessionStorage.getItem(StorageKeys.REGISTRATION);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      PaymentLogger.error(`Error reading registration data:`, error);
      return null;
    }
  }

  /**
   * Store registration data with timestamp
   */
  static storeRegistrationData(data: Partial<RegistrationData>): boolean {
    try {
      const existingData = this.getRegistrationData() || {};
      const updatedData = { ...existingData, ...data };
      
      // Update timestamp if not set
      if (!updatedData.registrationTime) {
        updatedData.registrationTime = new Date().toISOString();
      }
      
      sessionStorage.setItem(StorageKeys.REGISTRATION, JSON.stringify(updatedData));
      return true;
    } catch (error) {
      PaymentLogger.error(`Error storing registration data:`, error);
      toast.error('אירעה שגיאה בשמירת נתוני הרשמה');
      return false;
    }
  }

  /**
   * Check if registration data is valid and not expired
   */
  static isRegistrationValid(): boolean {
    try {
      const data = this.getRegistrationData();
      
      if (!data?.registrationTime) {
        return false;
      }
      
      const registrationTime = new Date(data.registrationTime);
      const now = new Date();
      const timeDiffMinutes = (now.getTime() - registrationTime.getTime()) / (1000 * 60);
      
      // Registration expires after 30 minutes
      return timeDiffMinutes <= 30;
    } catch (error) {
      PaymentLogger.error('Error checking registration validity:', error);
      return false;
    }
  }

  /**
   * Clear registration data
   */
  static clearRegistrationData(): void {
    try {
      sessionStorage.removeItem(StorageKeys.REGISTRATION);
    } catch (error) {
      PaymentLogger.error(`Error clearing registration data:`, error);
    }
  }

  /**
   * Clear all auth-related storage
   */
  static clearAllAuthData(): void {
    try {
      PaymentLogger.log('Clearing all auth-related data from storage');
      Object.values(StorageKeys).forEach(key => {
        sessionStorage.removeItem(key);
      });
    } catch (error) {
      PaymentLogger.error('Error clearing auth data:', error);
    }
  }
}
