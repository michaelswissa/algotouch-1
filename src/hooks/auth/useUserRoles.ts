
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserRoles, DEFAULT_USER_ROLES } from '@/contexts/auth/role-types';

export const useUserRoles = () => {
  const [roles, setRoles] = useState<UserRoles>(DEFAULT_USER_ROLES);

  const fetchUserRoles = async (userId: string): Promise<UserRoles> => {
    try {
      console.log('Fetching user roles for user:', userId);

      // Since this is a simpler implementation, we'll return a default role
      // In a production app, this would query the database for user roles
      const userRoles: UserRoles = {
        isAdmin: false,
        isModerator: false,
        roles: ['user']
      };

      setRoles(userRoles);
      return userRoles;
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return DEFAULT_USER_ROLES;
    }
  };

  return { roles, fetchUserRoles };
};

export { DEFAULT_USER_ROLES };
