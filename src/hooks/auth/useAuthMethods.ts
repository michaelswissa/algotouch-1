
import { useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';

/**
 * Hook providing authentication methods (sign in, sign up, etc.)
 */
export function useAuthMethods() {
  // Sign in function with improved error handling
  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    try {
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
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }, []);

  // Sign up function with improved error handling
  const signUp = useCallback(async (userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) => {
    try {
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
    }
  }, []);

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error.message);
        throw error;
      }
      
      console.log('Sign out successful');
      toast.success('התנתקת בהצלחה');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }, []);

  // Update profile function
  const updateProfile = useCallback(async (userData: any) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
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
    }
  }, []);

  // Reset password function
  const resetPassword = useCallback(async (email: string) => {
    try {
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
    }
  }, []);

  return {
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword
  };
}
