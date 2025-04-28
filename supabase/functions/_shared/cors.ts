
// Secure CORS configuration with origin validation
export const getCorsHeaders = (requestOrigin: string | null) => {
  const allowedOrigins = [
    Deno.env.get("FRONTEND_URL") || "https://943ea41c-32cf-4f38-9bf8-8a57a35db025.lovableproject.com",
    "https://943ea41c-32cf-4f38-9bf8-8a57a35db025.lovableproject.com",
    "http://localhost:5173"
  ];
  
  const origin = allowedOrigins.includes(requestOrigin || "") ? 
    requestOrigin : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };
};
