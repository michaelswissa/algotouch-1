
/**
 * Helper function to generate CORS headers
 */
export function getCorsHeaders(requestOrigin: string | null): HeadersInit {
  // Check if the origin is allowed
  const allowedOrigins = [
    'https://algotouch.lovable.app',
    'https://www.algotouch.co.il',
    'https://algotouch.co.il',
    'http://localhost:3000',
    'http://localhost:5173',
  ];
  
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : '*';
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
}
