
import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and Anon Key STRICTLY from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance = null;

// Validate that environment variables are set
if (!supabaseUrl) {
  console.error('CRITICAL ERROR: VITE_SUPABASE_URL environment variable is not set.');
}

if (!supabaseAnonKey) {
  console.error('CRITICAL ERROR: VITE_SUPABASE_ANON_KEY environment variable is not set.');
}

// Create a single supabase client for interacting with the database
// Ensure the variables are defined before creating the client
if (supabaseUrl && supabaseAnonKey) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: localStorage
    }
  });
  console.log('Supabase client initialized successfully.');
} else {
  console.error('Supabase client failed to initialize due to missing environment variables.');
}

export const supabase = supabaseInstance;

