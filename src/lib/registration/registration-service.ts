
import { supabase } from '@/integrations/supabase/client';

export interface RegistrationData {
  email?: string;
  password?: string;
  userData?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  planId?: string;
  contractSigned?: boolean;
  contractSignedAt?: string;
  contractDetails?: {
    contractHtml?: string;
    signature?: string;
    agreedToTerms?: boolean;
    agreedToPrivacy?: boolean;
    contractVersion?: string;
    browserInfo?: any;
  };
  registrationTime?: string;
  userCreated?: boolean;
}

/**
 * Stores registration data in session storage
 */
export function storeRegistrationData(data: Partial<RegistrationData>): boolean {
  try {
    const existingData = getRegistrationData();
    const updatedData = { ...existingData, ...data };
    
    // Update timestamp
    if (!updatedData.registrationTime) {
      updatedData.registrationTime = new Date().toISOString();
    }
    
    sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
    return true;
  } catch (error) {
    console.error('Error storing registration data:', error);
    return false;
  }
}

/**
 * Retrieves registration data from session storage
 */
export function getRegistrationData(): RegistrationData {
  try {
    const data = sessionStorage.getItem('registration_data');
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error retrieving registration data:', error);
    return {};
  }
}

/**
 * Clears registration data from session storage
 */
export function clearRegistrationData(): void {
  sessionStorage.removeItem('registration_data');
  sessionStorage.removeItem('contract_data');
}

/**
 * Create a user account from registration data
 */
export async function createUserFromRegistration(data: RegistrationData): Promise<{
  success: boolean;
  userId?: string;
  error?: any;
}> {
  if (!data.email || !data.password) {
    return { success: false, error: 'Missing required fields' };
  }

  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.userData?.firstName,
          last_name: data.userData?.lastName,
          phone: data.userData?.phone,
          full_name: `${data.userData?.firstName || ''} ${data.userData?.lastName || ''}`.trim()
        }
      }
    });

    if (error) {
      console.error('Error creating user account:', error);
      return { success: false, error };
    }

    const userId = authData.user?.id;
    if (!userId) {
      return { success: false, error: 'User creation failed' };
    }

    // Update registration data to mark user as created
    storeRegistrationData({ userCreated: true });

    return { success: true, userId };
  } catch (error) {
    console.error('Exception during account creation:', error);
    return { success: false, error };
  }
}
