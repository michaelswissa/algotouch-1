
// Create types file for auth context
import { User, Session } from '@supabase/supabase-js';

export interface RegistrationData {
  email?: string;
  password?: string;
  userData?: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    idNumber?: string;
  };
  planId?: string;
  contractSigned?: boolean;
  contractDetails?: any;
  registrationTime?: string;
  isValid?: boolean;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  initialized: boolean;
  error: Error | null;
  registrationData: RegistrationData | null;
  isRegistering: boolean;
  pendingSubscription: boolean;
  signIn: (credentials: { email: string; password: string }) => Promise<any>;
  signUp: (credentials: { email: string; password: string; metadata?: any }) => Promise<any>;
  signOut: () => Promise<any>;
  updateProfile: (profile: any) => Promise<any>;
  resetPassword: (email: string) => Promise<any>;
  setRegistrationData: (data: Partial<RegistrationData>) => void;
  clearRegistrationData: () => void;
  setPendingSubscription: (pending: boolean) => void;
}
