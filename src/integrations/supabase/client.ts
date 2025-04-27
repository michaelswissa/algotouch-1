
import { createClient } from '@supabase/supabase-js';

// These are safe to expose in the browser as they are public keys
// Updated with the correct API key from the error logs
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ndhakvhrrkczgylcmyoc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaGFrdmhycmtjemd5bGNteW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4NTUxNzIsImV4cCI6MjA1ODQzMTE3Mn0.dJg3Pe8DNXuvy4PvcBwBo64K2Le-zptEuYZtr_49xIk';

// Create a single supabase client for interacting with the database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage
  }
});
