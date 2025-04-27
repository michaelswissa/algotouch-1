
import { Session, User } from '@supabase/supabase-js';
import { UserRoles } from './role-types';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRoles: UserRoles;
  loading: boolean;
  isAuthenticated: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{
    success: boolean;
    session?: Session | null;
    user?: User | null;
    error?: string;
  }>;
  signUp: (userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (userData: any) => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  checkUserRole: (role: string) => boolean;
  refreshUserRoles: () => Promise<void>;
}
