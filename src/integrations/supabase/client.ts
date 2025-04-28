
import { createClient } from '@supabase/supabase-js';

// These environment variables must be set in your Supabase project settings
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Error: Missing Supabase configuration.\n' +
    'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your Supabase project settings.'
  );
}

// Create Supabase client with validated configuration
export const supabase = createClient(
  supabaseUrl || '',  // Fallback to empty string to prevent runtime errors
  supabaseAnonKey || '', 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: localStorage
    }
  }
);

// Validate client initialization
if (!supabaseUrl || !supabaseAnonKey) {
  // This warning will help developers quickly identify configuration issues
  console.warn(
    'Warning: Supabase client initialized with invalid configuration.\n' +
    'This may cause authentication and database operations to fail.\n' +
    'Please check your environment variables and Supabase project settings.'
  );
}
