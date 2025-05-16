import React, { createContext } from 'react';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  initialized: boolean;
  error: Error | null;
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

const initialContext: AuthContextProps = {
  session: null,
  user: null,
  loading: true,
  isAuthenticated: false,
  initialized: false,
  error: null,
  signIn: async () => {},
  signUp: async () => ({ success: false, user: null }),
  signOut: async () => {},
  updateProfile: async () => {},
  resetPassword: async () => false,
};

export const AuthContext = createContext<AuthContextProps>(initialContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Set up auth state listener and initialize session
  useEffect(() => {
    let isSubscriptionActive = true;
    
    try {
      // Set up auth state listener first
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, newSession) => {
          if (!isSubscriptionActive) return;
          
          console.log('Auth state changed:', event);
          
          // Only synchronous state updates here to prevent loops
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          // Handle special events using setTimeout to prevent loops
          if (event === 'SIGNED_IN' && newSession?.user) {
            setTimeout(() => {
              try {
                if (newSession.user?.user_metadata?.is_new_user === true) {
                  const firstName = newSession.user?.user_metadata?.first_name || '';
                  const lastName = newSession.user?.user_metadata?.last_name || '';
                  const fullName = `${firstName} ${lastName}`.trim() || newSession.user.email || 'משתמש';
                  
                  // Update user metadata
                  supabase.auth.updateUser({
                    data: { is_new_user: false }
                  }).catch(err => console.error('Error updating user metadata:', err));
                  
                  toast.success(`ברוך הבא, ${fullName}!`);
                }
              } catch (error) {
                console.error('Error in welcome user logic:', error);
              }
            }, 100);
          }
        }
      );

      // Then check for existing session
      const initializeAuth = async () => {
        try {
          console.log('Checking for existing session...');
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
        isSubscriptionActive = false;
        subscription.unsubscribe();
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
  const handleSignIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('Sign in error:', error.message);
        
        // Provide user-friendly error messages
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
  const handleSignUp = async (userData: {
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
  const handleSignOut = async () => {
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
  const handleUpdateProfile = async (userData: any) => {
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
  const handleResetPassword = async (email: string) => {
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

  return (
    <AuthContext.Provider 
      value={{
        session,
        user,
        loading,
        isAuthenticated: !!user,
        initialized,
        error,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        updateProfile: handleUpdateProfile,
        resetPassword: handleResetPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
