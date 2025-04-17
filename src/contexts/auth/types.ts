
import { Session, User } from '@supabase/supabase-js';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  initialized: boolean;
  isAdmin: boolean; // Added admin flag
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
}
