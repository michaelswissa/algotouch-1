
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Handle CORS preflight requests
function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }
  return null;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { lowProfileId } = await req.json();

    if (!lowProfileId) {
      return new Response(
        JSON.stringify({ error: 'Missing lowProfileId parameter', success: false }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Checking transaction status for:', lowProfileId);

    // Get the Cardcom API credentials 
    const terminalNumber = "160138";
    const apiName = "bLaocQRMSnwphQRUVG3b";

    // Create request body for Cardcom API
    const getLowProfileRequest = {
      TerminalNumber: terminalNumber,
      ApiName: apiName,
      LowProfileId: lowProfileId
    };

    // Make request to Cardcom API
    const response = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/GetLpResult", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(getLowProfileRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Cardcom API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Cardcom API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Cardcom status check response:', JSON.stringify(data));

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking transaction status:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
