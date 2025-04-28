
import { createClient } from '@supabase/supabase-js';

// These environment variables must be set in your project settings
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ndhakvhrrkczgylcmyoc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaGFrdmhycmtjemd5bGNteW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NTUxNzIsImV4cCI6MjA1ODQzMTE3Mn0.dJg3Pe8DNXuvy4PvcBwBo64K2Le-zptEuYZtr_49xIk';

// Create Supabase client with validated configuration
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey, 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: localStorage
    }
  }
);

// Log configuration for debug purposes
console.log('Supabase client initialized with URL:', 
  supabaseUrl ? supabaseUrl.substring(0, 15) + '...' : 'undefined');

// Validate client initialization
if (!supabaseUrl || !supabaseAnonKey) {
  // This warning will help developers quickly identify configuration issues
  console.warn(
    'Warning: Supabase client initialized with fallback values.\n' +
    'This is acceptable for development but ensure environment variables are properly set for production.'
  );
}
