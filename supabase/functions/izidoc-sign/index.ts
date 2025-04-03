
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

// Creates a Supabase client with the provided credentials
function createSupabaseClient() {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase credentials");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Validates required fields in the signing request
function validateRequest(request: SigningRequest) {
  if (!request.userId || !request.planId || !request.fullName || !request.signature || !request.email) {
    throw new Error("Missing required fields");
  }
}

// Stores signature information in the database
async function storeSignature(supabase: any, request: SigningRequest, ipAddress: string) {
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
  
  return signatureData;
}

// Updates the subscription record to mark contract as signed
async function updateSubscription(supabase: any, userId: string, planId: string, signatureTimestamp: string) {
  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      contract_signed: true,
      contract_signed_at: signatureTimestamp,
      plan_type: planId,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId);
    
  if (updateError) {
    console.error("Error updating subscription:", updateError);
    throw updateError;
  }
}

// Prepares and sends notification email with contract attachment
async function sendNotificationEmail(
  supabase: any, 
  request: SigningRequest, 
  signatureTimestamp: string,
  ipAddress: string
) {
  try {
    const { data: user } = await supabase.auth.admin.getUserById(request.userId);
    if (user && user.user) {
      // Convert HTML contract to base64 for attachment
      const encoder = new TextEncoder();
      const contractBytes = encoder.encode(request.contractHtml);
      const contractBase64 = btoa(String.fromCharCode(...new Uint8Array(contractBytes)));
      
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
        <p>מצורף חוזה חתום כקובץ HTML. אנא פתח את הקובץ בדפדפן לצפייה.</p>
        <p>זהו מייל אוטומטי, אין צורך להשיב עליו.</p>
      `;

      console.log("Sending contract notification email to support@algotouch.co.il");
      
      // Send email via the SMTP sender function
      const smtpResponse = await sendEmailViaSmtp(
        supabase,
        "support@algotouch.co.il",
        `הסכם חדש נחתם - ${request.fullName}`,
        emailBody,
        [{
          filename: `contract-${request.fullName}-${signatureTimestamp}.html`,
          content: contractBase64,
          mimeType: "text/html"
        }]
      );
      
      return smtpResponse;
    }
  } catch (emailError) {
    console.error("Error sending notification email:", emailError);
    // Log detailed error for debugging
    console.error("Email error details:", JSON.stringify(emailError));
    // Don't throw error as this is not critical for the signing process
  }
}

// Helper function to send email via SMTP
async function sendEmailViaSmtp(
  supabase: any,
  to: string,
  subject: string,
  html: string,
  attachments?: Array<{filename: string, content: string, mimeType: string}>
) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  const smtpResponse = await fetch(`${SUPABASE_URL}/functions/v1/smtp-sender`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({
      to,
      subject,
      html,
      attachmentData: attachments
    })
  });
  
  if (!smtpResponse.ok) {
    const errorText = await smtpResponse.text();
    console.error("Failed to send email via SMTP:", errorText);
    throw new Error(`SMTP send failed: ${errorText}`);
  } else {
    const smtpResult = await smtpResponse.json();
    console.log("Email notification sent successfully via SMTP:", smtpResult);
    return smtpResult;
  }
}

// Main handler function for the edge function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client
    const supabase = createSupabaseClient();
    
    // Parse the request body
    const request: SigningRequest = await req.json();
    
    // Extract IP address from request headers if available
    const forwarded = req.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(/\s*,\s*/)[0] : req.headers.get("cf-connecting-ip") || "";
    
    // Validate required fields
    validateRequest(request);
    
    console.log("Processing digital signature for user:", request.userId);
    
    // Store signature in database
    const signatureData = await storeSignature(supabase, request, ipAddress);
    
    // Generate document ID and signature ID
    const documentId = signatureData.id;
    const signatureId = crypto.randomUUID();
    const signatureTimestamp = new Date().toISOString();
    
    // Update subscription record
    await updateSubscription(supabase, request.userId, request.planId, signatureTimestamp);
    
    // Send notification email
    await sendNotificationEmail(supabase, request, signatureTimestamp, ipAddress);
    
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
