
import { supabase } from '@/integrations/supabase/client';

interface RegistrationResult {
  userId: string | null;
  userEmail: string | null;
  fullName: string;
}

export const useRegistrationHandler = () => {
  const handleRegistrationData = async (): Promise<RegistrationResult> => {
    // Get registration data if available
    const registrationData = sessionStorage.getItem('registration_data');
    let userData = null;
    let userId = null;
    let userEmail = null;
    let fullName = '';
    
    // Check for authenticated user first
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // User is already authenticated
      userId = user.id;
      userEmail = user.email;
      fullName = user.user_metadata?.full_name || 
               `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim();
      console.log("Using authenticated user for payment:", { userId, userEmail });
    } else if (registrationData) {
      // Handle registration data if user is not authenticated
      userData = JSON.parse(registrationData);
      userEmail = userData.email;
      fullName = userData.userData?.firstName && userData.userData?.lastName ? 
        `${userData.userData.firstName} ${userData.userData.lastName}` : userEmail;
      
      // Try to create user if not created already
      if (!userData.userCreated && userData.email && userData.password) {
        console.log("Creating new user account from registration data");
        try {
          const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
              data: {
                first_name: userData.userData?.firstName,
                last_name: userData.userData?.lastName,
                phone: userData.userData?.phone,
                full_name: `${userData.userData?.firstName || ''} ${userData.userData?.lastName || ''}`.trim()
              }
            }
          });
          
          if (!signUpError && authData.user) {
            userData.userCreated = true;
            sessionStorage.setItem('registration_data', JSON.stringify(userData));
            userId = authData.user.id;
            console.log("User created successfully:", userId);
            
            // Sign in the user immediately
            await supabase.auth.signInWithPassword({
              email: userData.email,
              password: userData.password
            });
          } else {
            console.error("Error creating user account:", signUpError);
          }
        } catch (createError) {
          console.error("Error during account creation:", createError);
        }
      }
    }

    return { userId, userEmail, fullName };
  };

  return { handleRegistrationData };
};
