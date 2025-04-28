
// Secure CORS configuration with origin validation
export const getCorsHeaders = (requestOrigin: string | null) => {
  const allowedOrigin = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
  return {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Origin': requestOrigin === allowedOrigin ? requestOrigin : allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
};
