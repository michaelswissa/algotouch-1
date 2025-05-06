
import { useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { StorageService } from '@/services/storage/StorageService';
import { UserRoles, DEFAULT_USER_ROLES } from '@/hooks/auth/useUserRoles';
import { sendWelcomeEmail } from '@/lib/email-service';

export const useAuthState = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [userRoles, setUserRoles] = useState<UserRoles>(DEFAULT_USER_ROLES);

  const fetchUserRoles = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        PaymentLogger.error('Error fetching user roles:', error);
        return DEFAULT_USER_ROLES;
      }

      const roles = data.map(r => r.role);
      return {
        roles,
        isAdmin: roles.includes('admin'),
        isModerator: roles.includes('moderator') || roles.includes('admin')
      };
    } catch (error) {
      PaymentLogger.error('Exception fetching user roles:', error);
      return DEFAULT_USER_ROLES;
    }
  }, []);

  const refreshUserRoles = useCallback(async () => {
    if (user) {
      const fetchedRoles = await fetchUserRoles(user.id);
      setUserRoles(fetchedRoles);
    } else {
      setUserRoles(DEFAULT_USER_ROLES);
    }
  }, [user, fetchUserRoles]);

  useEffect(() => {
    PaymentLogger.log('Setting up auth state listener');
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        PaymentLogger.log('Auth state changed:', { event, email: newSession?.user?.email });
        
        // Only synchronous state updates here to prevent loops
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Handle sign in event - send welcome email if needed using setTimeout to prevent loop
        if (event === 'SIGNED_IN' && newSession?.user) {
          // Only send welcome email if user is new (and this metadata exists)
          // This prevents sending welcome emails every time a user logs in
          setTimeout(() => {
            try {
              if (newSession.user?.user_metadata?.is_new_user === true) {
                const firstName = newSession.user?.user_metadata?.first_name || '';
                const lastName = newSession.user?.user_metadata?.last_name || '';
                const fullName = `${firstName} ${lastName}`.trim() || newSession.user.email || 'משתמש';
                
                // Send welcome email and then update user metadata to mark that email was sent
                sendWelcomeEmail(newSession.user.email || '', fullName)
                  .then(() => {
                    // After sending welcome email, update user metadata to indicate email was sent
                    supabase.auth.updateUser({
                      data: { 
                        is_new_user: false,
                        welcome_email_sent: true
                      }
                    }).catch(err => PaymentLogger.error('Error updating user metadata:', err));
                  })
                  .catch(err => {
                    PaymentLogger.error('Error sending welcome email:', err);
                    // Still mark as not new to prevent future attempts
                    supabase.auth.updateUser({
                      data: { is_new_user: false }
                    }).catch(err => PaymentLogger.error('Error updating user metadata:', err));
                  });
              }
            } catch (error) {
              PaymentLogger.error('Error in welcome email logic:', error);
            }
          }, 500);
          
          // Fetch user roles after sign in
          setTimeout(() => {
            refreshUserRoles();
          }, 800);
        }
        
        if (event === 'SIGNED_OUT') {
          // Reset roles when user signs out
          setUserRoles(DEFAULT_USER_ROLES);
          // Clear registration data on sign out
          StorageService.clearAllSubscriptionData();
        }
      }
    );

    // Then check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        PaymentLogger.log('Initial session check:', existingSession?.user?.email || 'No session');
        
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        
        // If we have a user, fetch their roles
        if (existingSession?.user) {
          await refreshUserRoles();
        }
      } catch (error) {
        PaymentLogger.error('Error checking session:', error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();

    return () => {
      PaymentLogger.log('Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, [refreshUserRoles]);

  const checkUserRole = (role: string) => {
    if (role === 'admin') return userRoles.isAdmin;
    if (role === 'moderator') return userRoles.isModerator;
    return userRoles.roles.includes(role as any);
  };

  return {
    session,
    user,
    userRoles,
    loading,
    isAuthenticated: !!user,
    initialized,
    checkUserRole,
    refreshUserRoles
  };
};
