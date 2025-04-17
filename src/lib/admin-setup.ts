
import { supabase } from '@/integrations/supabase/client';

/**
 * Creates an admin user with full access to all content
 * Note: This should only be used in development or during initial setup
 */
export const createAdminUser = async () => {
  try {
    // Check if admin user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'support@algotouch.co.il')
      .single();
    
    if (existingUser) {
      console.log('Admin user already exists');
      return { success: true, message: 'Admin user already exists' };
    }

    // Create the admin user
    const { data: user, error } = await supabase.auth.signUp({
      email: 'support@algotouch.co.il',
      password: 'Algotouch@2025',
      options: {
        data: {
          first_name: 'Admin',
          last_name: 'User',
          is_admin: true,
          full_access: true
        }
      }
    });

    if (error) {
      console.error('Error creating admin user:', error);
      return { success: false, message: error.message };
    }

    console.log('Admin user created successfully');
    return { success: true, user };
  } catch (error) {
    console.error('Error in admin user creation:', error);
    return { success: false, message: 'An unexpected error occurred' };
  }
};
