import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

interface RegistrationResult {
  userId: string;
  userEmail: string;
  fullName: string;
}

export const useRegistrationHandler = () => {
  const handleRegistrationData = async (): Promise<RegistrationResult> => {
    console.log("Starting registration data handling");
    
    // Get registration data if available
    const registrationDataString = sessionStorage.getItem('registration_data');
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
      console.log("Using authenticated user for payment:", { userId, userEmail, fullName });
    } else if (registrationDataString) {
      // Handle registration data if user is not authenticated
      try {
        console.log("Found registration data in session storage");
        const registrationData = JSON.parse(registrationDataString);
        userData = registrationData;
        userEmail = userData.email;
        fullName = userData.userData?.firstName && userData.userData?.lastName ? 
          `${userData.userData.firstName} ${userData.userData.lastName}` : userEmail;

        // If we have a stored ID, use it, otherwise generate one
        if (userData.id) {
          userId = userData.id;
        } else {
          // Generate a persistent ID for this anonymous user
          userId = `anon-${uuidv4()}`;
          // Store it back in registration data
          userData.id = userId;
          sessionStorage.setItem('registration_data', JSON.stringify(userData));
          console.log("Generated and stored new anonymous user ID:", userId);
        }
      } catch (parseError) {
        console.error("Error parsing registration data:", parseError);
      }
      
      // Try to create user if not created already
      if (!userData?.userCreated && userData?.email && userData?.password) {
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

    // If we still don't have values, create fallbacks for essential data
    if (!userId) {
      userId = `anon-${uuidv4()}`;
      console.log("Generated fallback userId:", userId);
    }
    
    if (!userEmail) {
      userEmail = `guest-${userId.substring(0, 8)}@example.com`;
      console.log("Generated fallback userEmail:", userEmail);
    }

    if (!fullName) {
      fullName = `Guest User`;
      console.log("Using default fullName:", fullName);
    }

    const result = { userId, userEmail, fullName };
    console.log("Registration data handling completed:", result);
    return result;
  };

  return { handleRegistrationData };
};
