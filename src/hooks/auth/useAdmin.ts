
import { useAuth } from '@/contexts/auth';

/**
 * Hook to easily check if the current user is an admin
 */
export const useAdmin = () => {
  const { userRoles, isAuthenticated } = useAuth();
  
  return {
    isAdmin: isAuthenticated && userRoles.isAdmin,
    isModerator: isAuthenticated && userRoles.isModerator,
    hasRole: (role: string) => userRoles.roles.includes(role as any),
  };
};
