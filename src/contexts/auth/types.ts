
import { User, Session } from '@supabase/supabase-js';

export type RegistrationData = {
  email?: string;
  userData?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  contractSigned?: boolean;
  planId?: string;
  registrationTime?: string;
  isValid?: boolean;
};

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  initialized: boolean;
  error: Error | null;
  // Registration state
  registrationData: RegistrationData | null;
  isRegistering: boolean;
  pendingSubscription: boolean;
  // Auth methods
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  // Registration methods
  setRegistrationData: (data: Partial<RegistrationData>) => void;
  clearRegistrationData: () => void;
  setPendingSubscription: (pending: boolean) => void;
}
