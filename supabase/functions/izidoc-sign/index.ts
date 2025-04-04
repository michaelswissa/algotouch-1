
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userId, 
      planId, 
      fullName, 
      email, 
      signature,
      contractHtml,
      agreedToTerms,
      agreedToPrivacy,
      contractVersion,
      browserInfo
    } = await req.json();
    
    // Validate required parameters
    if (!userId || !planId || !fullName || !email || !signature) {
      throw new Error('Missing required parameters for contract signing');
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Store the signature image in the contract_signatures bucket
    const signatureBuffer = Buffer.from(signature.split(',')[1], 'base64');
    const signatureFileName = `${userId}-${Date.now()}-signature.png`;
    
    const { error: storageError } = await supabase
      .storage
      .from('contract_signatures')
      .upload(signatureFileName, signatureBuffer, {
        contentType: 'image/png',
        upsert: false
      });
      
    if (storageError) {
      console.error('Error storing signature image:', storageError);
      throw new Error('Failed to store signature image');
    }
    
    // Get the signed URL for the stored signature
    const { data: signatureUrl } = await supabase
      .storage
      .from('contract_signatures')
      .createSignedUrl(signatureFileName, 365 * 24 * 60 * 60); // 1 year expiry
    
    // Store the contract HTML file too
    const contractFileName = `${userId}-${Date.now()}-contract.html`;
    
    const { error: contractError } = await supabase
      .storage
      .from('contract_signatures')
      .upload(contractFileName, new TextEncoder().encode(contractHtml), {
        contentType: 'text/html',
        upsert: false
      });
      
    if (contractError) {
      console.error('Error storing contract HTML:', contractError);
      throw new Error('Failed to store contract HTML');
    }
    
    // Get public URL for the contract
    const { data: contractUrlData } = await supabase
      .storage
      .from('contract_signatures')
      .createSignedUrl(contractFileName, 365 * 24 * 60 * 60); // 1 year expiry
    
    // Add IP address info (if available)
    let ipAddress = null;
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      }
    } catch (e) {
      console.log('Could not get IP address:', e);
    }
    
    // Insert the contract signature data into the database
    const { data: contractData, error: contractInsertError } = await supabase
      .from('contract_signatures')
      .insert({
        user_id: userId,
        plan_id: planId,
        full_name: fullName,
        email: email,
        signature: signature,
        signature_url: signatureUrl?.signedUrl || null,
        contract_html: contractHtml,
        contract_url: contractUrlData?.signedUrl || null,
        agreed_to_terms: agreedToTerms,
        agreed_to_privacy: agreedToPrivacy,
        contract_version: contractVersion || "1.0",
        ip_address: ipAddress,
        user_agent: browserInfo?.userAgent || null,
        browser_info: browserInfo || null
      })
      .select('id')
      .single();
      
    if (contractInsertError) {
      console.error('Error inserting contract signature:', contractInsertError);
      throw new Error('Failed to record contract signature');
    }
    
    // Update subscription status
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .update({
        contract_signed: true,
        contract_signed_at: new Date().toISOString(),
        contract_signed_location: contractUrlData?.signedUrl || null
      })
      .eq('user_id', userId);
      
    if (subscriptionError) {
      console.error('Error updating subscription with contract info:', subscriptionError);
      // Non-critical error, don't throw
    }
    
    // Send confirmation email
    const { error: emailError } = await supabase.functions.invoke('smtp-sender', {
      body: {
        to: email,
        subject: 'אישור חתימת הסכם - Lovable',
        html: `
          <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
            <h2>שלום ${fullName},</h2>
            <p>תודה שחתמת על הסכם המנוי ל-Lovable!</p>
            <p>הסכם חתום נשמר במערכת שלנו. אתה מוזמן לצפות בו בכל עת דרך החשבון שלך.</p>
            <p>בברכה,<br>צוות Lovable</p>
          </div>
        `
      }
    });
    
    if (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Non-critical error, don't throw
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        contractId: contractData.id,
        signatureUrl: signatureUrl?.signedUrl,
        contractUrl: contractUrlData?.signedUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error processing contract signature:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
