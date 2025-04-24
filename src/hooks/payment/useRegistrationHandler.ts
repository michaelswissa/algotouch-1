import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export const useRegistrationHandler = () => {
  const handleRegistrationData = async () => {
    console.log('Getting registration data');
    
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
      try {
        userData = JSON.parse(registrationData);
        userEmail = userData.email;
        fullName = userData.userData?.firstName && userData.userData?.lastName ? 
          `${userData.userData.firstName} ${userData.userData.lastName}` : userEmail;
        
        // Use stored ID or generate a temporary one
        userId = userData.userId || uuidv4();
        
        // Store the userId in the registration data for future reference
        if (!userData.userId) {
          userData.userId = userId;
          sessionStorage.setItem('registration_data', JSON.stringify(userData));
        }
        
        console.log("Using registration data for payment:", { userId, userEmail });
      } catch (error) {
        console.error("Error parsing registration data:", error);
      }
    } else {
      console.error("No user or registration data available");
      throw new Error('יש להתחבר או להירשם לפני ביצוע תשלום');
    }

    if (!userId || !userEmail) {
      console.error("Failed to get user ID or email");
      throw new Error('חסרים פרטי משתמש הכרחיים לביצוע התשלום');
    }

    return { userId, userEmail, fullName: fullName || userEmail };
  };

  return {
    handleRegistrationData
  };
};
