
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

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

    // Validate required fields
    if (!lowProfileId) {
      return new Response(
        JSON.stringify({ ResponseCode: 400, Description: 'Missing required field: lowProfileId' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Checking transaction status for lowProfileId:', lowProfileId);

    // Get the Cardcom API credentials from environment variables
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL") || "160138";
    const apiName = Deno.env.get("CARDCOM_USERNAME") || "bLaocQRMSnwphQRUVG3b";
    
    // Query the Cardcom API for the transaction status
    const request = {
      TerminalNumber: Number(terminalNumber),
      ApiName: apiName,
      LowProfileId: lowProfileId
    };
    
    console.log('Sending request to Cardcom API:', JSON.stringify(request));
    
    const response = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/GetLpResult", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Cardcom API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Cardcom API error: ${response.status} ${response.statusText}`);
    }
    
    const cardcomResponse = await response.json();
    console.log('Received response from Cardcom API:', JSON.stringify(cardcomResponse));
    
    if (cardcomResponse.ResponseCode === 0 && cardcomResponse.TranzactionInfo?.TranzactionId) {
      console.log('Transaction successful:', cardcomResponse.TranzactionInfo.TranzactionId);
      
      // For successful transactions, update the subscription or registration in Supabase
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          // Check if this is a registration with temp data
          if (cardcomResponse.ReturnValue) {
            const planId = cardcomResponse.ReturnValue;
            
            // Get the most recent unused registration data
            const { data: registrationData } = await supabase
              .from('temp_registration_data')
              .select('*')
              .eq('used', false)
              .order('created_at', { ascending: false })
              .limit(1);
              
            if (registrationData && registrationData.length > 0) {
              console.log('Found registration data, processing registration');
              
              // Mark the registration data as used to prevent duplicate processing
              await supabase
                .from('temp_registration_data')
                .update({ used: true })
                .eq('id', registrationData[0].id);
                
              // Process transaction data for existing users
              // This would typically involve creating or updating a subscription record
              // or processing a one-time payment
            }
          }
        } catch (error) {
          console.error('Error processing Supabase updates:', error);
        }
      }
    }
    
    // Return the Cardcom response to the client
    return new Response(
      JSON.stringify(cardcomResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ 
        ResponseCode: 500, 
        Description: error instanceof Error ? error.message : 'An unexpected error occurred',
        error: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
