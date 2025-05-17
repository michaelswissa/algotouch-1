
import { useAuthState } from './useAuthState';
import { useAuthMethods } from './useAuthMethods';

/**
 * Main authentication hook that combines state and methods
 */
export function useSecureAuth() {
  const authState = useAuthState();
  const authMethods = useAuthMethods();
  
  return {
    ...authState,
    ...authMethods
  };
}

// Re-export the hook for backward compatibility
export { useSecureAuth };
