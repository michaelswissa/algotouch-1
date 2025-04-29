
// Secure CORS configuration with origin validation
export const getCorsHeaders = (requestOrigin: string | null) => {
  // Ensure the production domain is always allowed, in addition to the env var and localhost
  const productionDomain = "https://algotouch.lovable.app";
  const frontendUrlFromEnv = Deno.env.get("FRONTEND_URL");
  
  const allowedOrigins = [
    productionDomain, // Explicitly allow production domain
    "https://943ea41c-32cf-4f38-9bf8-8a57a35db025.lovableproject.com", // Keep Lovable dev env
    "http://localhost:5173",
    "http://localhost:3000",
  ];

  // Add frontendUrlFromEnv if it exists and is not already in the list
  if (frontendUrlFromEnv && !allowedOrigins.includes(frontendUrlFromEnv)) {
    allowedOrigins.push(frontendUrlFromEnv);
  }
  
  // Check if the request origin is in our allowed list
  // Default to productionDomain if origin is not allowed or null
  const origin = allowedOrigins.includes(requestOrigin || "") ? 
    requestOrigin : productionDomain;
  
  console.log(`CORS: Request origin: ${requestOrigin}, Allowed origin: ${origin}`);
  
  return {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };
};
