
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuthContext } from './AuthContext';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          setTimeout(() => {
            navigate('/auth');
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Registration - Create a temporary account without signing in
  const registerUser = async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      
      // First, check if email already exists
      // Using the search functionality instead of filter
      const { data: existingUsers, error: checkError } = await supabase.auth.admin
        .listUsers({ 
          page: 1,
          perPage: 1,
          query: email
        });
      
      if (checkError) {
        console.error('Error checking existing user:', checkError);
      }
      
      // Check if users array has any entries
      if (existingUsers && existingUsers.users && existingUsers.users.length > 0) {
        throw new Error('משתמש עם כתובת אימייל זו כבר קיים במערכת');
      }
      
      // Create a user without signing them in
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            registration_complete: false, // Mark that registration is incomplete
            signup_step: 'contract', // Next step in the flow
            signup_date: new Date().toISOString()
          },
        }
      });
      
      if (error) {
        toast.error(error.message);
        throw error;
      }
      
      if (!data.user) {
        throw new Error('יצירת משתמש נכשלה');
      }
      
      // After successful registration, store signup data
      sessionStorage.setItem('registration_data', JSON.stringify({
        userId: data.user.id,
        email,
        password,
        userData
      }));
      
      toast.success('רישום ראשוני בוצע בהצלחה');
      
      // Redirect to contract signing
      navigate('/subscription');
    } catch (error) {
      console.error('Error registering:', error);
      toast.error(error.message || 'אירעה שגיאה בתהליך הרישום');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in after payment is confirmed
  const completeRegistration = async (userId: string, email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      
      // Sign in with the credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        console.error('Error signing in after registration:', signInError);
        throw signInError;
      }
      
      // Update the user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone,
          birth_date: userData.birthDate,
          street: userData.street,
          city: userData.city,
          postal_code: userData.postalCode,
          country: userData.country || 'Israel'
        })
        .eq('id', userId);
      
      if (profileError) {
        console.error('Error updating profile:', profileError);
      }
      
      // Update user metadata to show registration is complete
      await supabase.auth.updateUser({
        data: {
          registration_complete: true,
          signup_step: 'completed'
        }
      });
      
      // Clear registration data from session storage
      sessionStorage.removeItem('registration_data');
      
      toast.success('ההרשמה הושלמה בהצלחה!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing registration:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast.error(error.message);
        throw error;
      }
      
      toast.success('התחברת בהצלחה!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error signing in:', error);
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
        toast.error(error.message);
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
        toast.error(error.message);
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

  const value = {
    session,
    user,
    loading,
    isAuthenticated: !!user,
    signIn,
    registerUser,
    completeRegistration,
    signOut,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
