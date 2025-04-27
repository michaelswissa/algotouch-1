
// Shared utility functions for CardCom edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Log a step in the function execution with optional details
 */
export async function logStep(
  functionName: string,
  step: string, 
  details?: any, 
  level: 'info' | 'warn' | 'error' = 'info',
  supabaseAdmin?: any
) {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  const prefix = `[CARDCOM-${functionName.toUpperCase()}][${level.toUpperCase()}][${timestamp}]`;
  
  console.log(`${prefix} ${step}${detailsStr}`);
  
  // Store critical logs in database
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
      // Don't let logging errors affect main flow
      console.error('Failed to log to database:', e);
    }
  }
}

/**
 * Validate if a string is a valid UUID for LowProfileId
 */
export function validateLowProfileId(lowProfileId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lowProfileId);
}

/**
 * Validate if amount is a valid positive number
 */
export function validateAmount(amount: number): boolean {
  return !isNaN(amount) && amount > 0;
}

/**
 * Check for duplicate transaction references
 */
export async function validateTransaction(supabaseAdmin: any, transactionRef: string) {
  const { data: existingTransaction } = await supabaseAdmin
    .from('payment_sessions')
    .select('id, status')
    .eq('reference', transactionRef)
    .limit(1);

  return existingTransaction?.[0] || null;
}
