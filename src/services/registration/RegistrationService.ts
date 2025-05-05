
import { supabase } from '@/integrations/supabase/client';
import { StorageService } from '@/services/storage/StorageService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

export interface RegistrationData {
  email: string;
  password: string;
  userData: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  registrationTime: string;
  userCreated?: boolean;
}

interface AccountCreationResult {
  success: boolean;
  error?: any;
  userId?: string;
}

export class RegistrationService {
  /**
   * Creates a user account in Supabase using the registration data
   * 
   * @param registrationData Registration data with user information
   * @returns Result with success status and error if any
   */
  static async createUserAccount(registrationData: any): Promise<AccountCreationResult> {
    try {
      PaymentLogger.log('Creating user account from registration data');
      
      // In some cases we might have StorageData which doesn't have password field
      // Ensure we have the password from either registrationData or contract data
      let password = registrationData.password;
      
      if (!password) {
        // Try to get password from contract data if missing
        const contractData = StorageService.getContractData();
        if (contractData && contractData.password) {
          PaymentLogger.log('Using password from contract data');
          password = contractData.password;
        } else {
          throw new Error('Missing password for user creation');
        }
      }
      
      // Create the user in Supabase
      const { data, error } = await supabase.auth.signUp({
        email: registrationData.email,
        password: password,
        options: {
          data: {
            first_name: registrationData.userData.firstName,
            last_name: registrationData.userData.lastName,
            phone: registrationData.userData.phone,
            full_name: `${registrationData.userData.firstName} ${registrationData.userData.lastName}`.trim(),
          },
        },
      });
      
      if (error) {
        // If user already exists, we'll consider this a success
        if (error.message.includes('already registered')) {
          PaymentLogger.log('User already exists, signing in instead');
          
          // Try to sign in with the credentials
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: registrationData.email,
            password: password,
          });
          
          if (signInError) {
            throw signInError;
          }
          
          // Update registration data to mark user as created
          StorageService.storeRegistrationData({ userCreated: true });
          
          return { success: true };
        }
        
        throw error;
      }
      
      // Update registration data to mark user as created
      StorageService.storeRegistrationData({ userCreated: true });
      
      return { 
        success: true,
        userId: data.user?.id 
      };
    } catch (error) {
      PaymentLogger.error('Error creating user account:', error);
      return { 
        success: false, 
        error 
      };
    }
  }
}
