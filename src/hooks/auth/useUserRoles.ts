
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserRoles, AppRole } from '@/contexts/auth/role-types';

export const DEFAULT_USER_ROLES: UserRoles = {
  isAdmin: false,
  isModerator: false,
  roles: []
};

export const useUserRoles = (userId?: string) => {
  const [roles, setRoles] = useState<UserRoles>(DEFAULT_USER_ROLES);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchUserRoles = useCallback(async (targetUserId?: string) => {
    if (!targetUserId) {
      return DEFAULT_USER_ROLES;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .rpc('get_user_roles', { user_id: targetUserId });

      if (error) {
        throw error;
      }

      const userRoles = Array.isArray(data) ? data as AppRole[] : [];
      const isAdmin = userRoles.includes('admin');
      const isModerator = userRoles.includes('moderator') || isAdmin;

      const newRoles: UserRoles = {
        isAdmin,
        isModerator,
        roles: userRoles
      };

      setRoles(newRoles);
      return newRoles;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch user roles');
      console.error('Error fetching user roles:', error);
      setError(error);
      return DEFAULT_USER_ROLES;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkRole = useCallback((role: AppRole): boolean => {
    if (role === 'admin') return roles.isAdmin;
    if (role === 'moderator') return roles.isModerator;
    return roles.roles.includes(role);
  }, [roles]);

  return {
    roles,
    loading,
    error,
    fetchUserRoles,
    checkRole
  };
};
