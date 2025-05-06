
import { supabase } from '@/integrations/supabase/client';
import { StorageService } from '@/services/storage/StorageService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

interface RegistrationResult {
  success: boolean;
  userId?: string;
  error?: Error;
}

export class RegistrationService {
  /**
   * Creates a user account from registration data stored in session storage
   */
  static async createUserAccount(registrationData: any): Promise<RegistrationResult> {
    try {
      if (!registrationData) {
        throw new Error('No registration data provided');
      }

      PaymentLogger.log('Creating user account from registration data', { 
        email: registrationData.email,
        hasPassword: !!registrationData.password
      });

      if (!registrationData.email || !registrationData.password) {
        throw new Error('Missing required registration fields (email or password)');
      }

      // Check if user already exists
      const { data: existingUser, error: checkError } = await supabase.auth.signInWithPassword({
        email: registrationData.email,
        password: registrationData.password,
      });

      if (existingUser?.user) {
        PaymentLogger.log('User already exists, skipping creation', { 
          userId: existingUser.user.id 
        });
        
        // Set the user as created in registration data
        StorageService.updateRegistrationData({ userCreated: true });
        
        return {
          success: true,
          userId: existingUser.user.id
        };
      } else if (checkError && checkError.message !== 'Invalid login credentials') {
        throw new Error(`Error checking existing user: ${checkError.message}`);
      }

      // User doesn't exist, create the account
      const { data, error } = await supabase.auth.signUp({
        email: registrationData.email,
        password: registrationData.password,
        options: {
          data: {
            first_name: registrationData.firstName || '',
            last_name: registrationData.lastName || '',
            is_new_user: true,
            phone: registrationData.phone || ''
          }
        }
      });

      if (error) {
        throw new Error(`Error creating user account: ${error.message}`);
      }

      const userId = data.user?.id;
      
      if (!userId) {
        throw new Error('User created but no user ID returned');
      }

      // Update profile info if available
      if (registrationData.firstName || registrationData.lastName) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            first_name: registrationData.firstName || '',
            last_name: registrationData.lastName || '',
            phone: registrationData.phone || '',
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          PaymentLogger.error('Error updating user profile', profileError);
          // We don't throw here, as the account was created successfully
        }
      }

      // Set user as created in registration data
      StorageService.updateRegistrationData({ userCreated: true });

      PaymentLogger.log('User account created successfully', { userId });
      
      return {
        success: true,
        userId
      };
    } catch (error) {
      PaymentLogger.error('Error in createUserAccount', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
}
