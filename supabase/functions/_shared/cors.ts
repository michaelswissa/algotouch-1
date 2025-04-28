
// Secure CORS configuration with origin validation
export const getCorsHeaders = (requestOrigin: string | null) => {
  const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://943ea41c-32cf-4f38-9bf8-8a57a35db025.lovableproject.com";
  
  const allowedOrigins = [
    frontendUrl,
    "https://943ea41c-32cf-4f38-9bf8-8a57a35db025.lovableproject.com",
    "http://localhost:5173",
    "http://localhost:3000",
  ];
  
  // Check if the request origin is in our allowed list
  const origin = allowedOrigins.includes(requestOrigin || "") ? 
    requestOrigin : frontendUrl;
  
  console.log(`CORS: Request origin: ${requestOrigin}, Allowed origin: ${origin}`);
  
  return {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };
};
