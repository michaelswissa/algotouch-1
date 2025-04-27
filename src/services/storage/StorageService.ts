
import { toast } from 'sonner';

export interface StorageData {
  planId?: string;
  contractSigned?: boolean;
  email?: string;
  userId?: string;
  userData?: {
    firstName?: string;
    lastName?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ContractData {
  planId?: string;
  fullName?: string;
  email?: string;
  signed: boolean;
  signedDate?: string;
  agreeToTerms: boolean;
  [key: string]: any;
}

export interface PaymentData {
  sessionId?: string;
  lowProfileCode?: string;
  terminalNumber?: string;
  reference?: string;
  status?: 'pending' | 'completed' | 'failed';
  cardLastFour?: string;
  cardExpiry?: string;
}

export const StorageKeys = {
  REGISTRATION: 'registration_data',
  CONTRACT: 'contract_data',
  PAYMENT: 'payment_data',
} as const;

export class StorageService {
  /**
   * Get data from session storage
   */
  static get<T>(key: string): T | null {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error reading from storage (${key}):`, error);
      toast.error('אירעה שגיאה בטעינת הנתונים');
      return null;
    }
  }

  /**
   * Set data in session storage
   */
  static set<T>(key: string, data: T): boolean {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error writing to storage (${key}):`, error);
      toast.error('אירעה שגיאה בשמירת הנתונים');
      return false;
    }
  }

  /**
   * Remove data from session storage
   */
  static remove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from storage (${key}):`, error);
    }
  }

  /**
   * Get registration data
   */
  static getRegistrationData(): StorageData {
    return this.get<StorageData>(StorageKeys.REGISTRATION) || {};
  }

  /**
   * Update registration data
   */
  static updateRegistrationData(data: Partial<StorageData>): boolean {
    const current = this.getRegistrationData();
    return this.set(StorageKeys.REGISTRATION, { ...current, ...data });
  }

  /**
   * Get contract data
   */
  static getContractData(): ContractData | null {
    return this.get<ContractData>(StorageKeys.CONTRACT);
  }

  /**
   * Update contract data
   */
  static updateContractData(data: Partial<ContractData>): boolean {
    const current = this.getContractData() || { signed: false, agreeToTerms: false };
    return this.set(StorageKeys.CONTRACT, { ...current, ...data });
  }

  /**
   * Get payment data
   */
  static getPaymentData(): PaymentData | null {
    return this.get<PaymentData>(StorageKeys.PAYMENT);
  }

  /**
   * Update payment data
   */
  static updatePaymentData(data: Partial<PaymentData>): boolean {
    const current = this.getPaymentData() || {};
    return this.set(StorageKeys.PAYMENT, { ...current, ...data });
  }

  /**
   * Clear all subscription data
   */
  static clearAllSubscriptionData(): void {
    this.remove(StorageKeys.REGISTRATION);
    this.remove(StorageKeys.CONTRACT);
    this.remove(StorageKeys.PAYMENT);
  }
}
