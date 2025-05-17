
import { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase-client';

/**
 * Hook to manage authentication state and initialization
 */
export function useAuthState() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  // Initialize auth state and set up listeners
  useEffect(() => {
    console.log('Setting up auth state listener');
    let isSubscriptionActive = true;
    
    try {
      // Set up auth state listener first for improved reliability
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, newSession) => {
          if (!isSubscriptionActive) return;
          
          console.log('Auth state changed:', event, newSession?.user?.email);
          
          // Only synchronous state updates here to prevent loops
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          // Handle sign in event separately using setTimeout to prevent loops
          if (event === 'SIGNED_IN' && newSession?.user) {
            setTimeout(() => {
              try {
                if (newSession.user?.user_metadata?.is_new_user === true) {
                  const firstName = newSession.user?.user_metadata?.first_name || '';
                  const lastName = newSession.user?.user_metadata?.last_name || '';
                  const fullName = `${firstName} ${lastName}`.trim() || newSession.user.email || 'משתמש';
                  
                  // Import and use the sendWelcomeEmail function
                  import('@/lib/email-service').then(({ sendWelcomeEmail }) => {
                    sendWelcomeEmail(newSession.user?.email || '', fullName)
                      .then(() => {
                        supabase.auth.updateUser({
                          data: { 
                            is_new_user: false,
                            welcome_email_sent: true
                          }
                        }).catch(err => console.error('Error updating user metadata:', err));
                      })
                      .catch(err => {
                        console.error('Error sending welcome email:', err);
                        supabase.auth.updateUser({
                          data: { is_new_user: false }
                        }).catch(err => console.error('Error updating user metadata:', err));
                      });
                  });
                }
              } catch (error) {
                console.error('Error in welcome email logic:', error);
              }
            }, 500);
          }
        }
      );

      // Then check for existing session
      const initializeAuth = async () => {
        try {
          console.log('Checking for existing session...');
          const { data: { session: existingSession }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error checking session:', error);
            setInitError(error);
            throw error;
          }
          
          console.log('Initial session check:', existingSession?.user?.email || 'No session');
          
          setSession(existingSession);
          setUser(existingSession?.user ?? null);
        } catch (error: any) {
          console.error('Error during auth initialization:', error);
          setInitError(error);
          // Continue setting initialized to true so we don't get stuck
        } finally {
          setLoading(false);
          setInitialized(true);
        }
      };

      initializeAuth();

      return () => {
        console.log('Cleaning up auth listener');
        isSubscriptionActive = false;
        subscription.unsubscribe();
      };
    } catch (error: any) {
      console.error('Critical error setting up auth:', error);
      setInitError(error);
      setLoading(false);
      setInitialized(true);
      return () => {};
    }
  }, []);

  return {
    session,
    user,
    loading,
    isAuthenticated: !!user,
    initialized,
    error: initError
  };
}
