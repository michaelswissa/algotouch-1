
import { createClient } from '@supabase/supabase-js';

// These are safe to expose in the browser as they are public keys
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ndhakvhrrkczgylcmyoc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaGFrdmhycmtjemd5bGNteW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTUwMjY2MDQsImV4cCI6MjAxMDYwMjYwNH0.zScCSR9Xr6I8XGCUXkl2Qf9MvHN0NpjJnEtViHfGIL8';

// Create a single supabase client for interacting with the database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage
  }
});
