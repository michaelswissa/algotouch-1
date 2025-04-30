/**
 * Get CORS headers for edge functions
 * @param requestOrigin The Origin header from the request
 * @returns Headers object with CORS headers
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://ndhakvhrrkczgylcmyoc.supabase.co',
    'https://algotouch.lovable.app'
  ];

  // If the request has an Origin header and it's in the allowed list, use that
  // Otherwise use the wildcard *
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : '*';

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };
}
