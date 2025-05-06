
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { StorageService } from '@/services/storage/StorageService';
import { toast } from 'sonner';

// Define an interface for registration data to properly type it
interface RegistrationData {
  registrationTime?: string;
  userCreated?: boolean;
  [key: string]: any;
}

// Redirects authenticated users to their appropriate location
export const useAuthRedirect = (isAuthenticated: boolean) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // If authenticated, redirect to appropriate page
    if (isAuthenticated) {
      const destination = location.state?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);
};

// Checks for registration data and handles necessary actions
export const useRegistrationCheck = () => {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      // Check if there's any registration data in storage
      const registrationData = StorageService.get('registration_data') as RegistrationData | null;
      
      if (registrationData) {
        // Validate registration timestamp (if needed)
        // Consider it valid if created in the last 30 minutes
        if (registrationData.registrationTime) {
          const regTime = new Date(registrationData.registrationTime);
          const now = new Date();
          const timeDiffInMinutes = (now.getTime() - regTime.getTime()) / (1000 * 60);
          
          if (timeDiffInMinutes > 30) {
            // Registration data is too old, clear it
            StorageService.clearAllSubscriptionData();
            toast.error('מידע ההרשמה פג תוקף, אנא הירשם שנית');
          } else if (!registrationData.userCreated) {
            // Valid registration data exists, redirect to subscription page if not on auth page
            if (!window.location.pathname.includes('/auth')) {
              navigate('/subscription', {
                replace: true,
                state: { isRegistering: true }
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking registration data:', error);
    }
  }, [navigate]);
};
