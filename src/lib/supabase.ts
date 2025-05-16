
import { createClient } from '@supabase/supabase-js';
import type { ExtendedDatabase } from '@/types/supabase';

// The Supabase URL and key are defined at build time
const SUPABASE_URL = "https://ndhakvhrrkczgylcmyoc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaGFrdmhycmtjemd5bGNteW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NTUxNzIsImV4cCI6MjA1ODQzMTE3Mn0.dJg3Pe8DNXuvy4PvcBwBo64K2Le-zptEuYZtr_49xIk";

// Create a singleton instance of the Supabase client with proper configuration
export const supabase = createClient<ExtendedDatabase>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

// Export type-safe wrapper functions for common operations

// Authentication helpers
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(
  email: string, 
  password: string, 
  options?: { 
    firstName?: string; 
    lastName?: string; 
    phone?: string;
  }
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: options?.firstName,
        last_name: options?.lastName,
        phone: options?.phone,
        is_new_user: true
      },
      emailRedirectTo: `${window.location.origin}/auth?verification=success`
    }
  });
  
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  
  if (error) throw error;
  return true;
}

// User profile helpers
export async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId: string, profileData: Partial<{
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  street: string;
  postal_code: string;
  country: string;
  birth_date: string;
}>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', userId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

// Subscription helpers
export async function checkSubscriptionStatus(userId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
    
  if (error) throw error;
  
  if (!data) return { hasSubscription: false };
  
  const now = new Date();
  const trialEndsAt = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
  const periodEndsAt = data.current_period_ends_at ? new Date(data.current_period_ends_at) : null;
  
  const isActive = data.status === 'active';
  const isTrial = data.status === 'trial' && trialEndsAt && trialEndsAt > now;
  const isPeriodValid = periodEndsAt && periodEndsAt > now;
  
  return {
    hasSubscription: isActive || isTrial || isPeriodValid,
    subscription: data,
    isActive,
    isTrial,
    isPeriodValid,
    trialEndsAt,
    periodEndsAt
  };
}

// Edge function callers with standard error handling
export async function invokeEdgeFunction<T = any>(
  functionName: string, 
  payload?: any,
  options?: { throwError?: boolean }
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke<T>(functionName, {
      body: payload
    });
    
    if (error && options?.throwError) {
      throw error;
    }
    
    return { data, error };
  } catch (error: any) {
    if (options?.throwError) {
      throw error;
    }
    return { data: null, error };
  }
}
