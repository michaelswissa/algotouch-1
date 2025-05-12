
import { Session, User } from '@supabase/supabase-js';

export type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;
  isAuthenticated: boolean;
  error: Error | null;
};

export type AuthContextType = AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) => Promise<{ success: boolean; user: User | null }>;
  signOut: () => Promise<void>;
  updateProfile: (userData: any) => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
};
