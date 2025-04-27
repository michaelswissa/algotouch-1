import { toast } from 'sonner';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

export interface StorageData {
  planId?: string;
  contractSigned?: boolean;
  email?: string;
  userId?: string;
  userData?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    [key: string]: any;
  };
  registrationTime?: string;
  userCreated?: boolean;
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
  timestamp?: string;
}

export interface PaymentIntent {
  planId: string;
  amount: number;
  timestamp?: string;
}

export const StorageKeys = {
  REGISTRATION: 'registration_data',
  CONTRACT: 'contract_data',
  PAYMENT: 'payment_data',
  PAYMENT_INTENT: 'payment_intent',
} as const;

export class StorageService {
  /**
   * Get data from session storage with error handling
   */
  static get<T>(key: string): T | null {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      PaymentLogger.error(`Error reading from storage (${key}):`, error);
      return null;
    }
  }

  /**
   * Set data in session storage with error handling
   */
  static set<T>(key: string, data: T): boolean {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      PaymentLogger.error(`Error writing to storage (${key}):`, error);
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
      PaymentLogger.error(`Error removing from storage (${key}):`, error);
    }
  }

  /**
   * Store registration intent for pending payment
   */
  static storeRegistrationIntent(data: Partial<PaymentIntent>): boolean {
    const intent = {
      ...data,
      timestamp: new Date().toISOString()
    };
    return this.set(StorageKeys.PAYMENT_INTENT, intent);
  }

  /**
   * Get registration intent
   */
  static getRegistrationIntent(): PaymentIntent | null {
    return this.get<PaymentIntent>(StorageKeys.PAYMENT_INTENT);
  }

  /**
   * Get registration data
   */
  static getRegistrationData(): StorageData {
    const data = this.get<StorageData>(StorageKeys.REGISTRATION);
    return data || {};
  }

  /**
   * Store registration data with timestamp
   */
  static storeRegistrationData(data: Partial<StorageData>): boolean {
    const existingData = this.getRegistrationData();
    const updatedData = { ...existingData, ...data };
    
    // Update timestamp if not set
    if (!updatedData.registrationTime) {
      updatedData.registrationTime = new Date().toISOString();
    }
    
    return this.set(StorageKeys.REGISTRATION, updatedData);
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
   * Update payment data with timestamp
   */
  static updatePaymentData(data: Partial<PaymentData>): boolean {
    const current = this.getPaymentData() || {};
    
    // Add timestamp if updating status
    if (data.status && data.status !== current.status) {
      data.timestamp = new Date().toISOString();
    }
    
    return this.set(StorageKeys.PAYMENT, { ...current, ...data });
  }

  /**
   * Clear all subscription data
   */
  static clearAllSubscriptionData(): void {
    this.remove(StorageKeys.REGISTRATION);
    this.remove(StorageKeys.CONTRACT);
    this.remove(StorageKeys.PAYMENT);
    this.remove(StorageKeys.PAYMENT_INTENT);
  }
  
  /**
   * Check if registration data is valid and not expired
   */
  static isRegistrationValid(): boolean {
    try {
      const data = this.getRegistrationData();
      
      if (!data.registrationTime) {
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
   * Check if payment intent is valid and not expired
   */
  static isPaymentIntentValid(): boolean {
    try {
      const data = this.getRegistrationIntent();
      
      if (!data || !data.timestamp) {
        return false;
      }
      
      const intentTime = new Date(data.timestamp);
      const now = new Date();
      const timeDiffMinutes = (now.getTime() - intentTime.getTime()) / (1000 * 60);
      
      // Payment intent expires after 60 minutes
      return timeDiffMinutes <= 60;
    } catch (error) {
      PaymentLogger.error('Error checking payment intent validity:', error);
      return false;
    }
  }
}
