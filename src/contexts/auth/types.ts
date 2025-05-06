
import { Session, User } from '@supabase/supabase-js';
import { UserRoles } from './role-types';
import { SignupFormData, AuthResponse } from '@/types/auth';

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
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (userData: SignupFormData) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  updateProfile: (userData: any) => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
}
