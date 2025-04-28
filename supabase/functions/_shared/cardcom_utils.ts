
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Helper logging function for enhanced debugging
export const logStep = async (
  functionName: string,
  step: string, 
  details?: any, 
  level: 'info' | 'warn' | 'error' = 'info',
  supabaseAdmin?: any
) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  const prefix = `[CARDCOM-${functionName.toUpperCase()}][${level.toUpperCase()}][${timestamp}]`;
  
  console.log(`${prefix} ${step}${detailsStr}`);
  
  if (level === 'error' && supabaseAdmin) {
    try {
      await supabaseAdmin.from('system_logs').insert({
        function_name: `cardcom-${functionName}`,
        level,
        message: step,
        details: details || {},
        created_at: timestamp
      });
    } catch (e) {
      console.error('Failed to log to database:', e);
    }
  }
};

// Validate amount is not negative or NaN
export const validateAmount = (amount: number): boolean => {
  return !isNaN(amount) && amount >= 0;
};

// Validate lowProfileId format (UUID)
export const validateLowProfileId = (lowProfileId: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(lowProfileId);
};

// Check for duplicate payments
export const checkDuplicatePayment = async (
  supabaseAdmin: any, 
  lowProfileId: string
): Promise<boolean> => {
  // Check payment_sessions table first
  const { data: sessionData } = await supabaseAdmin
    .from('payment_sessions')
    .select('status')
    .eq('low_profile_id', lowProfileId)
    .eq('status', 'completed')
    .maybeSingle();
  
  if (sessionData) {
    return true;
  }
  
  // Check payment logs as fallback
  const { data: logsData } = await supabaseAdmin
    .from('user_payment_logs')
    .select('status')
    .eq('token', lowProfileId)
    .in('status', ['payment_success', 'token_created'])
    .maybeSingle();
    
  return !!logsData;
};
