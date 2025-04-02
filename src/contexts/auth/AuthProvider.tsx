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

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const registerUser = async (email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      
      const { data: existingUsers, error: checkError } = await supabase.auth.admin
        .listUsers({ 
          page: 1,
          perPage: 1
        });
      
      if (checkError) {
        console.error('Error checking existing user:', checkError);
      }
      
      const existingUser = existingUsers?.users?.find(user => 
        user.email?.toLowerCase() === email.toLowerCase()
      );
      
      if (existingUser) {
        throw new Error('משתמש עם כתובת אימייל זו כבר קיים במערכת');
      }
      
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            registration_complete: false,
            signup_step: 'contract',
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
      
      sessionStorage.setItem('registration_data', JSON.stringify({
        userId: data.user.id,
        email,
        password,
        userData
      }));
      
      toast.success('רישום ראשוני בוצע בהצלחה');
      
      navigate('/subscription');
    } catch (error) {
      console.error('Error registering:', error);
      toast.error(error.message || 'אירעה שגיאה בתהליך הרישום');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async (userId: string, email: string, password: string, userData: any) => {
    try {
      setLoading(true);
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        console.error('Error signing in after registration:', signInError);
        throw signInError;
      }
      
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
      
      await supabase.auth.updateUser({
        data: {
          registration_complete: true,
          signup_step: 'completed'
        }
      });
      
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
