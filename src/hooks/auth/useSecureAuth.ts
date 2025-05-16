
import { User } from '@supabase/supabase-js';
import { useAuthState } from './useAuthState';
import { useAuthInitialization } from './useAuthInitialization';
import { useAuthMethods } from './useAuthMethods';

// Improved authentication hook with better error handling and typed responses
export function useSecureAuth() {
  const {
    session,
    setSession,
    user,
    setUser,
    loading,
    setLoading,
    initialized,
    setInitialized,
    initError,
    setInitError,
    isAuthenticated
  } = useAuthState();

  // Initialize auth state and set up listeners
  useAuthInitialization(
    setSession,
    setUser,
    setLoading,
    setInitialized,
    setInitError
  );

  // Auth methods
  const {
    signIn,
    signUp,
    signOut,
    updateProfile: updateProfileBase,
    resetPassword
  } = useAuthMethods(setLoading);

  // Wrapper for updateProfile that includes the user ID
  const updateProfile = async (userData: any) => {
    if (!user) {
      throw new Error('No user logged in');
    }
    return updateProfileBase(userData, user.id);
  };

  return {
    session,
    user,
    loading,
    isAuthenticated,
    initialized,
    error: initError,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword
  };
}
