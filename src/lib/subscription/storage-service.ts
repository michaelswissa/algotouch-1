
import { toast } from 'sonner';

export interface StorageData {
  planId?: string;
  contractSigned?: boolean;
  email?: string;
  userData?: {
    firstName?: string;
    lastName?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export const StorageKeys = {
  REGISTRATION: 'registration_data',
  CONTRACT: 'contract_data'
} as const;

export const StorageService = {
  get: <T>(key: string): T | null => {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error reading from storage (${key}):`, error);
      toast.error('אירעה שגיאה בטעינת הנתונים');
      return null;
    }
  },

  set: <T>(key: string, data: T): boolean => {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error writing to storage (${key}):`, error);
      toast.error('אירעה שגיאה בשמירת הנתונים');
      return false;
    }
  },

  remove: (key: string): void => {
    sessionStorage.removeItem(key);
  },

  getRegistrationData: (): StorageData => {
    return StorageService.get<StorageData>(StorageKeys.REGISTRATION) || {};
  },

  updateRegistrationData: (data: Partial<StorageData>): boolean => {
    const current = StorageService.getRegistrationData();
    return StorageService.set(StorageKeys.REGISTRATION, { ...current, ...data });
  }
};

export default StorageService;
