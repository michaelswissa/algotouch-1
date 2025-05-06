
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sendWelcomeEmail } from '@/lib/email-service';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { StorageService } from '@/services/storage/StorageService';

export const useAuthActions = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      PaymentLogger.log('Attempting to sign in user', { email });
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        PaymentLogger.error('Sign in error:', error);
        toast.error(error.message || 'שגיאה בתהליך ההתחברות');
        throw error;
      }
      
      if (!data.session || !data.user) {
        const errorMsg = 'ההתחברות נכשלה - לא התקבלה תגובה מהשרת';
        PaymentLogger.error(errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      PaymentLogger.log('Sign in successful', { userId: data.user.id });
      toast.success('התחברת בהצלחה!');
      
      // Check for contract data to determine where to navigate
      const contractData = sessionStorage.getItem('contract_data');
      if (contractData) {
        PaymentLogger.log('Found contract data, redirecting to subscription');
        navigate('/subscription', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
      
      return { success: true, session: data.session, user: data.user };
    } catch (error) {
      PaymentLogger.error('Error during sign in:', error);
      return { 
        success: false, 
        session: null, 
        user: null, 
        error: error instanceof Error ? error.message : 'שגיאה בתהליך ההתחברות'
      };
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
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
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

  return {
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword
  };
};
