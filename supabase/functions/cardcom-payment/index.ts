
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from token if available
    let user = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const { data } = await supabaseClient.auth.getUser();
        user = data.user;
        console.log('Authenticated user:', user?.email);
      } catch (authError) {
        console.error('Auth error:', authError);
        // Continue without user - might be registration flow
      }
    }

    // Create payment session with Cardcom
    if (path === 'create-payment') {
      const { 
        planId, 
        userId, 
        fullName, 
        email, 
        operationType, 
        successRedirectUrl, 
        errorRedirectUrl,
        registrationData 
      } = await req.json();
      
      console.log('Creating payment session for:', { 
        planId, 
        userId: userId || (user?.id || 'anonymous'), 
        email: email || user?.email || 'anonymous',
        hasRegistrationData: !!registrationData
      });
      
      // Store registration data temporarily if provided
      // This allows us to recreate it after redirect
      let tempRegistrationId = null;
      if (registrationData) {
        try {
          // Generate a unique ID for this registration attempt
          tempRegistrationId = crypto.randomUUID();
          
          // Store in a temporary table with short expiration
          const { error: tempError } = await supabaseClient
            .from('temp_registration_data')
            .insert({
              id: tempRegistrationId,
              registration_data: registrationData,
              expires_at: new Date(Date.now() + 30 * 60000).toISOString() // 30 min expiry
            });
            
          if (tempError) {
            console.error('Error storing temp registration:', tempError);
            // Fall back to session storage approach if this fails
            tempRegistrationId = null;
          } else {
            console.log('Stored temp registration data with ID:', tempRegistrationId);
          }
        } catch (storageError) {
          console.error('Error in temp registration storage:', storageError);
          tempRegistrationId = null;
        }
      }
      
      // In a real implementation, you would make an API call to Cardcom
      // Here, for demonstration purposes, we'll create a simulated payment URL
      
      const baseUrl = req.headers.get('origin') || 'http://localhost:3000';
      const regParam = tempRegistrationId ? `&regId=${tempRegistrationId}` : '';
      const paymentUrl = `${baseUrl}/subscription?step=4&success=true&plan=${planId}${regParam}`;
      
      // Log the created payment session for debugging
      console.log('Created payment URL:', paymentUrl);
      
      return new Response(
        JSON.stringify({
          success: true,
          url: paymentUrl,
          tempRegistrationId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Retrieve stored registration data
    if (path === 'get-registration-data') {
      const { registrationId } = await req.json();
      
      if (!registrationId) {
        return new Response(
          JSON.stringify({ error: 'Missing registration ID' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      
      console.log('Retrieving registration data for ID:', registrationId);
      
      const { data, error } = await supabaseClient
        .from('temp_registration_data')
        .select('registration_data')
        .eq('id', registrationId)
        .single();
        
      if (error || !data) {
        console.error('Error retrieving temp registration:', error);
        return new Response(
          JSON.stringify({ error: 'Registration data not found or expired' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }
      
      // Delete the temporary data after retrieval
      await supabaseClient
        .from('temp_registration_data')
        .delete()
        .eq('id', registrationId);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          registrationData: data.registration_data 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // If no valid path is provided
    return new Response(
      JSON.stringify({ error: 'Invalid endpoint' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
