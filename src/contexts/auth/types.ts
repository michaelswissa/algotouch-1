
import { Session, User } from '@supabase/supabase-js';
import { UserRoles } from './role-types';
import { SignupFormData } from '@/types/auth';

export interface AuthContextType {
  // Auth state
  session: Session | null;
  user: User | null;
  userRoles: UserRoles;
  loading: boolean;
  isAuthenticated: boolean;
  initialized: boolean;
  checkUserRole: (role: string) => boolean;
  refreshUserRoles: () => Promise<void>;

  // Auth actions
  signIn: (email: string, password: string) => Promise<{
    success: boolean;
    session: Session | null;
    user: User | null;
    error?: string;
  }>;
  signUp: (userData: SignupFormData) => Promise<{ 
    success: boolean; 
    user: User | null;
    error?: string;
  }>;
  signOut: () => Promise<void>;
  updateProfile: (userData: any) => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
}
