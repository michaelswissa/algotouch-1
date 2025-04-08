
import { useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';
import { sendWelcomeEmail } from '@/lib/email-service';

// Improved authentication hook with better error handling and typed responses
export function useSecureAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Initialize auth state and set up listeners
  useEffect(() => {
    console.log('Setting up auth state listener');
    
    // Set up auth state listener first for improved reliability
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state changed:', event, newSession?.user?.email);
        
        // Only synchronous state updates here to prevent loops
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Handle sign in event separately using setTimeout to prevent loops
        if (event === 'SIGNED_IN' && newSession?.user) {
          setTimeout(() => {
            try {
              if (newSession.user?.user_metadata?.is_new_user === true) {
                const firstName = newSession.user?.user_metadata?.first_name || '';
                const lastName = newSession.user?.user_metadata?.last_name || '';
                const fullName = `${firstName} ${lastName}`.trim() || newSession.user.email || 'משתמש';
                
                // Send welcome email then update user metadata
                sendWelcomeEmail(newSession.user.email || '', fullName)
                  .then(() => {
                    supabase.auth.updateUser({
                      data: { 
                        is_new_user: false,
                        welcome_email_sent: true
                      }
                    }).catch(err => console.error('Error updating user metadata:', err));
                  })
                  .catch(err => {
                    console.error('Error sending welcome email:', err);
                    supabase.auth.updateUser({
                      data: { is_new_user: false }
                    }).catch(err => console.error('Error updating user metadata:', err));
                  });
              }
            } catch (error) {
              console.error('Error in welcome email logic:', error);
            }
          }, 500);
        }
      }
    );

    // Then check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        console.log('Initial session check:', existingSession?.user?.email || 'No session');
        
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();

    return () => {
      console.log('Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  // Sign in function with improved error handling
  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('Sign in error:', error.message);
        
        // Provide more user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('פרטי התחברות שגויים. אנא בדוק את הדוא"ל והסיסמה');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('הדוא"ל שלך לא אומת. אנא בדוק את תיבת הדואר הנכנס שלך');
        } else {
          throw error;
        }
      }
      
      console.log('Sign in successful');
      toast.success('התחברת בהצלחה!');

      // Instead of using navigate, we'll let the Router handle navigation
      // based on the updated auth state
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Other auth functions with similar improvements...
  const signUp = useCallback(async (userData: {
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
      
      console.log('Sign up successful, user:', data.user);
      toast.success('נרשמת בהצלחה! נא לאמת את כתובת הדוא"ל');
      
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error.message);
        throw error;
      }
      
      console.log('Sign out successful');
      toast.success('התנתקת בהצלחה');
      
      // Let Router handle the navigation based on auth state
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (userData: any) => {
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
      
      console.log('Profile updated successfully');
      toast.success('הפרופיל עודכן בהצלחה');
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        console.error('Password reset error:', error.message);
        throw error;
      }
      
      console.log('Password reset email sent successfully');
      toast.success('הוראות לאיפוס הסיסמה נשלחו לדוא"ל שלך');
      return true;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    session,
    user,
    loading,
    isAuthenticated: !!user,
    initialized,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword
  };
}
