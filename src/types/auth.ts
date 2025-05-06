
import { User, Session } from '@supabase/supabase-js';

/**
 * Form data for signup
 */
export interface SignupFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

/**
 * Auth state interface
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

/**
 * Form validation errors
 */
export interface ValidationErrors {
  [key: string]: string | null;
}

/**
 * Registration data stored during signup flow
 */
export interface RegistrationData {
  email: string;
  password: string;
  userData: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  registrationTime: string;
  userCreated?: boolean;
  planId?: string;
  contractSigned?: boolean;
}

/**
 * Auth response interface for consistency
 */
export interface AuthResponse {
  success: boolean;
  user: User | null;
  session?: Session | null;
  error?: string;
}
