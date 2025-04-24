
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface RegistrationResult {
  userId: string;
  userEmail: string;
  fullName: string;
}

export const useRegistrationHandler = () => {
  const navigate = useNavigate();

  const handleRegistrationData = async (): Promise<RegistrationResult> => {
    // Get registration data if available
    const registrationData = sessionStorage.getItem('registration_data');
    let userData = null;
    let userId = null;
    let userEmail = null;
    let fullName = '';
    
    console.log('Registration handler: checking authentication');
    
    // Check for authenticated user first
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // User is already authenticated
      userId = user.id;
      userEmail = user.email;
      fullName = user.user_metadata?.full_name || 
               `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim();
      console.log("Using authenticated user for payment:", { userId, userEmail, fullName });
    } else if (registrationData) {
      // Handle registration data if user is not authenticated
      try {
        userData = JSON.parse(registrationData);
        userEmail = userData.email;
        
        // Generate or use existing userId for guest users
        userId = userData.userId || uuidv4();
        
        // Store userId back to registration data for consistency
        if (!userData.userId) {
          userData.userId = userId;
          sessionStorage.setItem('registration_data', JSON.stringify(userData));
        }
        
        // Construct fullName from userData if available
        fullName = userData.userData?.firstName && userData.userData?.lastName ? 
          `${userData.userData.firstName} ${userData.userData.lastName}` : 
          userData.email;
        
        console.log("Using registration data for payment:", { userId, userEmail, fullName });
      } catch (error) {
        console.error("Error parsing registration data:", error);
        
        // Set default values in case of parsing error
        userId = uuidv4();
        userEmail = "guest@example.com";
        fullName = "Guest User";
        
        toast.error('שגיאה בטעינת פרטי משתמש');
      }
    } else {
      console.warn("No authenticated user or registration data found");
      // Redirect to auth page after a short delay
      setTimeout(() => {
        toast.error('נא להירשם או להתחבר לפני תשלום');
        navigate('/auth', { state: { redirectToSubscription: true } });
      }, 100);
      
      // Return a placeholder user to prevent null returns
      userId = `guest-${uuidv4()}`;
      userEmail = "guest@placeholder.com";
      fullName = "אורח";
    }

    // Never return null values
    return { 
      userId: userId as string, 
      userEmail: userEmail as string, 
      fullName: fullName || userEmail || "אורח"
    };
  };

  return { handleRegistrationData };
};
