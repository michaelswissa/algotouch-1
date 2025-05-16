
import { useEffect } from 'react';
import { NavigateFunction } from 'react-router-dom';

interface UseAuthValidationProps {
  error: Error | null;
  navigate: NavigateFunction;
}

export const useAuthValidation = ({ error, navigate }: UseAuthValidationProps) => {
  // Store any auth error in localStorage for the error page
  useEffect(() => {
    if (error) {
      try {
        localStorage.setItem('auth_error', error.message || 'Unknown auth error');
        navigate('/auth-error', { replace: true });
      } catch (e) {
        console.error('Failed to store auth error:', e);
      }
    }
  }, [error, navigate]);
};
