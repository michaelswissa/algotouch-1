
/**
 * Helper function to get CORS headers based on the origin
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // List of allowed origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://lovable.dev',
    'https://algotouch.lovable.app'
  ];

  // Default CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, cache-control, x-requested-with',
    'Access-Control-Max-Age': '86400',
  };

  // Add origin to CORS headers if it's in the allowed list, otherwise use *
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return {
      ...corsHeaders,
      'Access-Control-Allow-Origin': requestOrigin,
    };
  } else {
    return {
      ...corsHeaders,
      'Access-Control-Allow-Origin': '*',
    };
  }
}
