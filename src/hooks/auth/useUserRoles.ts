
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/contexts/auth/role-types';

export interface UserRoles {
  isAdmin: boolean;
  isModerator: boolean;
  roles: AppRole[];
}

export const DEFAULT_USER_ROLES: UserRoles = {
  isAdmin: false,
  isModerator: false,
  roles: ['user'],
};

export const useUserRoles = () => {
  const [roles, setRoles] = useState<UserRoles>(DEFAULT_USER_ROLES);

  const fetchUserRoles = useCallback(async (userId: string): Promise<UserRoles> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user roles:', error);
        return DEFAULT_USER_ROLES;
      }

      if (!data || data.length === 0) {
        return { ...DEFAULT_USER_ROLES };
      }

      const roleList = data.map(r => r.role) as AppRole[];
      const newRoles = {
        roles: roleList,
        isAdmin: roleList.includes('admin'),
        isModerator: roleList.includes('moderator') || roleList.includes('admin')
      };

      setRoles(newRoles);
      return newRoles;
    } catch (error) {
      console.error('Error in fetchUserRoles:', error);
      return DEFAULT_USER_ROLES;
    }
  }, []);

  return { roles, fetchUserRoles };
};
