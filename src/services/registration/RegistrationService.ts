
import { supabase } from '@/integrations/supabase/client';
import { StorageService } from '../storage/StorageService';
import { PaymentLogger } from '../payment/PaymentLogger';
import { User } from '@supabase/supabase-js';

interface UserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
}

interface RegistrationData {
  email: string;
  password: string;
  userId?: string;
  userCreated?: boolean;
  userData?: UserData;
  planId?: string;
  contractSigned?: boolean;
  registrationTime?: string;
}

export class RegistrationService {
  /**
   * Get registration data from storage
   */
  static getValidRegistrationData(): RegistrationData | null {
    const data = StorageService.getRegistrationData();
    
    if (!data || !data.email || !data.password) {
      return null;
    }
    
    return data;
  }

  /**
   * Create a user account 
   */
  static async createUserAccount(registrationData: RegistrationData): Promise<{
    success: boolean;
    user: User | null;
    error?: string;
  }> {
    try {
      // Check if we already have a user ID (from a previous attempt)
      if (registrationData.userId && registrationData.userCreated) {
        // Try to get the existing user first
        const existingUser = await this.getCurrentUser();
        if (existingUser) {
          return { success: true, user: existingUser };
        }
      }

      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registrationData.email,
        password: registrationData.password,
      });

      if (authError || !authData.user) {
        // If the user already exists, try to sign in
        if (authError?.message?.includes('already exists')) {
          return await this.signInUser(registrationData.email, registrationData.password);
        }
        
        return { 
          success: false, 
          user: null, 
          error: authError?.message || 'Failed to create account' 
        };
      }

      const userId = authData.user.id;
      
      // Update registration data with the user ID
      StorageService.storeRegistrationData({
        ...registrationData,
        userId,
        userCreated: true,
        registrationTime: registrationData.registrationTime || new Date().toISOString()
      });
      
      // Create or update user profile if we have user data
      if (registrationData.userData) {
        await supabase.from('profiles').upsert({
          id: userId,
          first_name: registrationData.userData.firstName || '',
          last_name: registrationData.userData.lastName || '',
          phone: registrationData.userData.phone || '',
          company_name: registrationData.userData.company || '',
          plan_id: registrationData.planId || 'free',
          updated_at: new Date().toISOString()
        });
      }

      return { success: true, user: authData.user };
    } catch (error) {
      PaymentLogger.error('Error creating user account:', error);
      return { 
        success: false, 
        user: null, 
        error: error instanceof Error ? error.message : 'Unknown error creating account' 
      };
    }
  }

  /**
   * Sign in user with email and password
   */
  static async signInUser(email: string, password: string): Promise<{
    success: boolean;
    user: User | null;
    error?: string;
  }> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        return { 
          success: false, 
          user: null, 
          error: authError?.message || 'Failed to sign in' 
        };
      }

      return { success: true, user: authData.user };
    } catch (error) {
      PaymentLogger.error('Error signing in user:', error);
      return { 
        success: false, 
        user: null, 
        error: error instanceof Error ? error.message : 'Unknown error signing in' 
      };
    }
  }

  /**
   * Get the current logged in user
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      return sessionData?.session?.user || null;
    } catch (error) {
      PaymentLogger.error('Error getting current user:', error);
      return null;
    }
  }
}
