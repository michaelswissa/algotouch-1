
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { StorageService } from '@/services/storage/StorageService';
import { toast } from 'sonner';

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
      const registrationData = StorageService.get('registration_data');
      
      if (registrationData) {
        // Validate registration timestamp (if needed)
        // Consider it valid if created in the last 30 minutes
        if (typeof registrationData === 'object' && registrationData !== null) {
          const regTime = new Date(registrationData.registrationTime as string);
          const now = new Date();
          const timeDiffInMinutes = (now.getTime() - regTime.getTime()) / (1000 * 60);
          
          if (timeDiffInMinutes > 30) {
            // Registration data is too old, clear it
            StorageService.clearAllSubscriptionData();
            toast.error('מידע ההרשמה פג תוקף, אנא הירשם שנית');
          } else if (!(registrationData as any).userCreated) {
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
