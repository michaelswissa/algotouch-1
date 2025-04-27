
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { StorageService } from '@/services/storage/StorageService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { toast } from 'sonner';

export interface RegistrationData {
  email: string;
  password: string;
  userData?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    [key: string]: any;
  };
  planId?: string;
  contractSigned?: boolean;
  contractSignedAt?: string;
  userId?: string;
  registrationTime: string;
  userCreated?: boolean;
}

export class RegistrationService {
  /**
   * Create a new user account from registration data
   */
  static async createUserAccount(registrationData: RegistrationData): Promise<{
    success: boolean;
    user: User | null;
    error?: string;
  }> {
    try {
      if (!registrationData.email || !registrationData.password) {
        PaymentLogger.error('Missing required registration fields', { registrationData });
        return { 
          success: false, 
          user: null, 
          error: 'Missing required fields (email/password)' 
        };
      }

      PaymentLogger.log('Creating user account', { 
        email: registrationData.email,
        hasUserData: !!registrationData.userData 
      });
      
      // Check if user is already created
      if (registrationData.userCreated && registrationData.userId) {
        PaymentLogger.log('User already created, skipping creation', { 
          userId: registrationData.userId 
        });
        
        // Try to get the user
        const { data: userData, error: getUserError } = await supabase.auth.getUser();
        if (userData?.user) {
          // Make sure we're authenticated as this user
          if (userData.user.id === registrationData.userId) {
            return { success: true, user: userData.user };
          } else {
            PaymentLogger.warn('User ID mismatch, signing out and attempting to sign in with stored credentials');
            await supabase.auth.signOut();
            return await this.signInUser(registrationData.email, registrationData.password);
          }
        }
        
        // If not authenticated, try to sign in
        PaymentLogger.log('User not authenticated, attempting to sign in');
        return await this.signInUser(registrationData.email, registrationData.password);
      }
      
      // Check if user already exists before creating
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: registrationData.email,
        password: registrationData.password
      });
      
      if (!signInError) {
        // User already exists and we've signed them in
        PaymentLogger.log('User already exists and signed in successfully');
        
        // Get the user data
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          // Update registration data to mark user as created
          registrationData.userCreated = true;
          registrationData.userId = userData.user.id;
          
          // Store updated registration data
          StorageService.storeRegistrationData(registrationData);
          
          return { success: true, user: userData.user };
        }
      }
      
      // Create the user since they don't exist
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: registrationData.email,
        password: registrationData.password,
        options: {
          data: {
            first_name: registrationData.userData?.firstName,
            last_name: registrationData.userData?.lastName,
            phone: registrationData.userData?.phone,
            full_name: `${registrationData.userData?.firstName || ''} ${registrationData.userData?.lastName || ''}`.trim()
          },
          // Disable email verification for now to simplify the flow
          emailRedirectTo: `${window.location.origin}/subscription`
        }
      });

      if (signUpError) {
        PaymentLogger.error('Error creating user account:', signUpError);
        
        // Check if user already exists
        if (signUpError.message?.includes('already exists')) {
          PaymentLogger.log('User already exists, attempting to sign in');
          return await this.signInUser(registrationData.email, registrationData.password);
        }
        
        return { success: false, user: null, error: signUpError.message };
      }

      const userId = authData.user?.id;
      if (!userId) {
        return { success: false, user: null, error: 'User creation failed - no user ID returned' };
      }

      // Update registration data to mark user as created
      registrationData.userCreated = true;
      registrationData.userId = userId;
      
      // Store updated registration data
      StorageService.storeRegistrationData(registrationData);
      
      PaymentLogger.log('User created successfully', { userId });
      
      // Sign in the user immediately
      if (!authData.session) {
        PaymentLogger.log('No session after signup, signing in explicitly');
        await this.signInUser(registrationData.email, registrationData.password);
      }
      
      return { success: true, user: authData.user };
      
    } catch (error: any) {
      PaymentLogger.error('Exception during account creation:', error);
      return { success: false, user: null, error: error.message || 'Unknown error' };
    }
  }
  
  /**
   * Sign in an existing user
   */
  static async signInUser(email: string, password: string): Promise<{
    success: boolean;
    user: User | null;
    error?: string;
  }> {
    try {
      PaymentLogger.log('Attempting to sign in user', { email });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
      });
      
      if (error) {
        PaymentLogger.error('Error signing in user:', error);
        return { success: false, user: null, error: error.message };
      }
      
      PaymentLogger.log('User signed in successfully', { userId: data.user?.id });
      return { success: true, user: data.user };
    } catch (error: any) {
      PaymentLogger.error('Exception during sign in:', error);
      return { success: false, user: null, error: error.message || 'Unknown error' };
    }
  }
  
  /**
   * Get and validate registration data from storage
   */
  static getValidRegistrationData(): RegistrationData | null {
    try {
      const data = StorageService.getRegistrationData();
      
      // Check if we have the minimum required data
      if (!data.email || !data.registrationTime) {
        PaymentLogger.warn('Invalid registration data', { data });
        return null;
      }
      
      // Check if registration is expired (30 minutes)
      const registrationTime = new Date(data.registrationTime);
      const now = new Date();
      const timeDiffMinutes = (now.getTime() - registrationTime.getTime()) / (1000 * 60);
      
      if (timeDiffMinutes > 30) {
        PaymentLogger.warn('Registration data expired', { 
          registrationTime: data.registrationTime,
          timeDiffMinutes
        });
        return null;
      }
      
      return data as RegistrationData;
    } catch (error) {
      PaymentLogger.error('Error retrieving registration data:', error);
      return null;
    }
  }
  
  /**
   * Check if the user is authenticated and get the current user
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data } = await supabase.auth.getUser();
      return data?.user || null;
    } catch (error) {
      PaymentLogger.error('Error getting current user:', error);
      return null;
    }
  }
}
