
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuthContext } from './AuthContext';
import { sendWelcomeEmail } from '@/lib/email-service';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Setting up auth state listener');
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state changed:', event, newSession?.user?.email);
        
        // Only synchronous state updates here to prevent loops
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Check if user is admin
        if (newSession?.user) {
          const isUserAdmin = newSession.user.user_metadata?.is_admin === true || 
                            newSession.user.email === 'support@algotouch.co.il';
          setIsAdmin(isUserAdmin);
        } else {
          setIsAdmin(false);
        }
        
        // Handle sign in event - send welcome email if needed using setTimeout to prevent loop
        if (event === 'SIGNED_IN' && newSession?.user) {
          // Only send welcome email if user is new (and this metadata exists)
          // This prevents sending welcome emails every time a user logs in
          setTimeout(() => {
            try {
              if (newSession.user?.user_metadata?.is_new_user === true) {
                const firstName = newSession.user?.user_metadata?.first_name || '';
                const lastName = newSession.user?.user_metadata?.last_name || '';
                const fullName = `${firstName} ${lastName}`.trim() || newSession.user.email || 'משתמש';
                
                // Send welcome email and then update user metadata to mark that email was sent
                sendWelcomeEmail(newSession.user.email || '', fullName)
                  .then(() => {
                    // After sending welcome email, update user metadata to indicate email was sent
                    supabase.auth.updateUser({
                      data: { 
                        is_new_user: false,
                        welcome_email_sent: true
                      }
                    }).catch(err => console.error('Error updating user metadata:', err));
                  })
                  .catch(err => {
                    console.error('Error sending welcome email:', err);
                    // Still mark as not new to prevent future attempts
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
        
        // Check admin status
        if (existingSession?.user) {
          const isUserAdmin = existingSession.user.user_metadata?.is_admin === true || 
                            existingSession.user.email === 'support@algotouch.co.il';
          setIsAdmin(isUserAdmin);
        }
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

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('Sign in error:', error.message);
        toast.error(error.message);
        throw error;
      }
      
      console.log('Sign in successful');
      toast.success('התחברת בהצלחה!');
      
      // Check for contract data to determine where to navigate
      const contractData = sessionStorage.getItem('contract_data');
      if (contractData) {
        console.log('Found contract data, redirecting to subscription');
        navigate('/subscription', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (userData: {
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    phone?: string
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
          // Remove emailRedirectTo to disable email verification
        }
      });
      
      if (error) {
        console.error('Sign up error:', error.message);
        toast.error(error.message);
        throw error;
      }
      
      // Store registration data for subscription flow
      const registrationData = {
        email,
        password,
        userData: {
          firstName,
          lastName,
          phone
        },
        registrationTime: new Date().toISOString()
      };
      sessionStorage.setItem('registration_data', JSON.stringify(registrationData));
      
      console.log('Sign up successful, proceeding to subscription');
      toast.success('נרשמת בהצלחה!');
      
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error.message);
        toast.error(error.message);
        throw error;
      }
      
      console.log('Sign out successful');
      toast.success('התנתקת בהצלחה');
      
      // Use a longer timeout for sign out to ensure all state is cleared
      // before redirecting, preventing flash of protected content
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 500);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

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
        toast.error(error.message);
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
  };

  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        console.error('Password reset error:', error.message);
        toast.error(error.message);
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
  };

  const value = {
    session,
    user,
    loading,
    isAuthenticated: !!user,
    initialized,
    isAdmin,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword
  };

  // Show a global loader when auth is initializing to prevent flashes of content
  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-t-primary"></div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
