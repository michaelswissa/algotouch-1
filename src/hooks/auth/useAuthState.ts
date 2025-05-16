
import { useState } from 'react';
import { Session, User } from '@supabase/supabase-js';

export function useAuthState() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  return {
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
    isAuthenticated: !!user
  };
}
