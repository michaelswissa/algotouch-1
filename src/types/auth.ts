
export interface User {
  id: string;
  email?: string;
  role?: string;
  app_metadata?: Record<string, any>;
  user_metadata?: Record<string, any>;
  created_at?: string;
  last_sign_in_at?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}
