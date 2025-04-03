
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SigningRequest {
  userId: string;
  planId: string;
  fullName: string;
  address?: string;
  idNumber?: string;
  phone?: string;
  email: string;
  signature: string;
  contractVersion: string;
  contractHtml: string;
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
  browserInfo: {
    userAgent: string;
    ipAddress?: string;
    language?: string;
    platform?: string;
    screenSize?: string;
    timeZone?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const IZIDOC_API_KEY = Deno.env.get("IZIDOC_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse the request body
    const request: SigningRequest = await req.json();
    
    // Extract IP address from request headers if available
    const forwarded = req.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(/\s*,\s*/)[0] : req.headers.get("cf-connecting-ip") || "";
    
    if (!request.userId || !request.planId || !request.fullName || !request.signature || !request.email) {
      throw new Error("Missing required fields");
    }
    
    console.log("Processing digital signature for user:", request.userId);
    
    // Store the signature information in the database
    const { data: signatureData, error: signatureError } = await supabase
      .from("contract_signatures")
      .insert({
        user_id: request.userId,
        plan_id: request.planId,
        full_name: request.fullName,
        address: request.address || null,
        id_number: request.idNumber || null,
        phone: request.phone || null,
        email: request.email,
        signature: request.signature,
        ip_address: ipAddress || request.browserInfo.ipAddress || null,
        user_agent: request.browserInfo.userAgent || null,
        browser_info: request.browserInfo || null,
        contract_version: request.contractVersion || "1.0",
        contract_html: request.contractHtml,
        agreed_to_terms: request.agreedToTerms,
        agreed_to_privacy: request.agreedToPrivacy
      })
      .select("id")
      .single();
      
    if (signatureError) {
      console.error("Error storing signature:", signatureError);
      throw signatureError;
    }
    
    // Generate document ID and signature ID
    const documentId = signatureData.id;
    const signatureId = crypto.randomUUID();
    const signatureTimestamp = new Date().toISOString();
    
    // Update the subscription record to mark contract as signed
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        contract_signed: true,
        contract_signed_at: signatureTimestamp,
        plan_type: request.planId,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", request.userId);
      
    if (updateError) {
      console.error("Error updating subscription:", updateError);
      throw updateError;
    }
    
    // Optional: Generate and store PDF (in a production environment)
    // In a real implementation, you would generate a PDF here and store it in the storage bucket
    
    // Call Gmail sender edge function to send confirmation email (asynchronous)
    try {
      const { data: user } = await supabase.auth.admin.getUserById(request.userId);
      if (user && user.user) {
        const emailBody = `
          <h1>הסכם חדש נחתם</h1>
          <p>שלום,</p>
          <p>המשתמש ${request.fullName} (${request.email}) חתם על הסכם לתכנית ${request.planId === 'monthly' ? 'חודשית' : 'שנתית'}.</p>
          <p>פרטי החתימה:</p>
          <ul>
            <li>זמן חתימה: ${signatureTimestamp}</li>
            <li>כתובת IP: ${ipAddress || "לא זוהה"}</li>
            <li>דפדפן: ${request.browserInfo.userAgent || "לא זוהה"}</li>
          </ul>
          <p>זהו מייל אוטומטי, אין צורך להשיב עליו.</p>
        `;

        await fetch(`${SUPABASE_URL}/functions/v1/gmail-sender`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            to: "support@algotouch.co.il", // Changed from admin@algotouch.co.il to support@algotouch.co.il
            subject: `הסכם חדש נחתם - ${request.fullName}`,
            html: emailBody
          })
        });
      }
    } catch (emailError) {
      console.error("Error sending notification email:", emailError);
      // Don't throw error as this is not critical for the signing process
    }
    
    // Return the signing result
    return new Response(JSON.stringify({
      success: true,
      documentId,
      signatureId,
      signedAt: signatureTimestamp
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing digital signature:", error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
