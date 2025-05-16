
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';
import { AuthContextType } from './types';

// Create context with a default value that doesn't cause errors
// This prevents issues when accessing context before provider is mounted
const defaultValue: AuthContextType = {
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  initialized: false,
  error: null,
  signIn: async () => { throw new Error('AuthContext not initialized') },
  signUp: async () => { throw new Error('AuthContext not initialized') },
  signOut: async () => { throw new Error('AuthContext not initialized') },
  updateProfile: async () => { throw new Error('AuthContext not initialized') },
  resetPassword: async () => { throw new Error('AuthContext not initialized') }
};

export const AuthContext = createContext<AuthContextType>(defaultValue);

// Create a provider component to wrap the app
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Set up auth state listener
  useEffect(() => {
    let isSubscribed = true;
    
    try {
      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, newSession) => {
          if (!isSubscribed) return;
          
          console.log('Auth state changed:', event);
          
          setSession(newSession);
          setUser(newSession?.user ?? null);
        }
      );

      // Check for existing session
      const initializeAuth = async () => {
        try {
          const { data: { session: existingSession }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error checking session:', error);
            setError(error);
            throw error;
          }
          
          setSession(existingSession);
          setUser(existingSession?.user ?? null);
        } catch (error: any) {
          console.error('Error during auth initialization:', error);
          setError(error);
        } finally {
          setLoading(false);
          setInitialized(true);
        }
      };

      initializeAuth();

      return () => {
        isSubscribed = false;
        subscription?.unsubscribe();
      };
    } catch (error: any) {
      console.error('Critical error setting up auth:', error);
      setError(error);
      setLoading(false);
      setInitialized(true);
      return () => {};
    }
  }, []);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('Sign in error:', error.message);
        
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('פרטי התחברות שגויים. אנא בדוק את הדוא"ל והסיסמה');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('הדוא"ל שלך לא אומת. אנא בדוק את תיבת הדואר הנכנס שלך');
        } else {
          throw error;
        }
      }
      
      toast.success('התחברת בהצלחה!');
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signUp = async (userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) => {
    try {
      setLoading(true);
      
      const { email, password, firstName, lastName, phone } = userData;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            is_new_user: true
          },
          emailRedirectTo: `${window.location.origin}/auth?verification=success`
        }
      });
      
      if (error) {
        console.error('Sign up error:', error.message);
        if (error.message.includes('already registered')) {
          throw new Error('כתובת הדוא"ל כבר קיימת במערכת');
        } else {
          throw error;
        }
      }
      
      toast.success('נרשמת בהצלחה! נא לאמת את כתובת הדוא"ל');
      
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error.message);
        throw error;
      }
      
      toast.success('התנתקת בהצלחה');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update profile function
  const updateProfile = async (userData: any) => {
    try {
      setLoading(true);
      
      if (!user) {
        throw new Error('No user logged in');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(userData)
        .eq('id', user.id);
      
      if (error) {
        console.error('Update profile error:', error.message);
        throw error;
      }
      
      toast.success('הפרופיל עודכן בהצלחה');
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        console.error('Password reset error:', error.message);
        throw error;
      }
      
      toast.success('הוראות לאיפוס הסיסמה נשלחו לדוא"ל שלך');
      return true;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Create the context value object
  const contextValue: AuthContextType = {
    session,
    user,
    loading,
    isAuthenticated: !!user,
    initialized,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Export a custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
