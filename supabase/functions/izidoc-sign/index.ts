
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
  console.log("Creating Supabase client");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase credentials");
    throw new Error("Missing Supabase credentials");
  }

  console.log(`Supabase URL: ${SUPABASE_URL}`);
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Validates required fields in the signing request
function validateRequest(request: SigningRequest) {
  console.log("Validating request fields");
  const requiredFields = ['userId', 'planId', 'fullName', 'signature', 'email'];
  const missingFields = requiredFields.filter(field => !request[field as keyof SigningRequest]);
  
  if (missingFields.length > 0) {
    console.error(`Missing required fields: ${missingFields.join(', ')}`);
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  console.log("Request validation successful");
}

// Stores signature information in the database
async function storeSignature(supabase: any, request: SigningRequest, ipAddress: string) {
  console.log(`Storing signature for user: ${request.userId}, plan: ${request.planId}`);
  try {
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
    
    console.log("Signature stored successfully with ID:", signatureData.id);
    return signatureData;
  } catch (error) {
    console.error("Exception storing signature:", error);
    throw new Error(`Failed to store signature: ${error.message}`);
  }
}

// Updates the subscription record to mark contract as signed
async function updateSubscription(supabase: any, userId: string, planId: string, signatureTimestamp: string) {
  console.log(`Updating subscription for user: ${userId}, plan: ${planId}`);
  try {
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
    
    console.log("Subscription updated successfully");
  } catch (error) {
    console.error("Exception updating subscription:", error);
    throw new Error(`Failed to update subscription: ${error.message}`);
  }
}

// Prepares and sends notification email with contract attachment
async function sendNotificationEmail(
  supabase: any, 
  request: SigningRequest, 
  signatureTimestamp: string,
  ipAddress: string
) {
  console.log("Preparing to send notification email");
  try {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(request.userId);
    
    if (userError) {
      console.error("Error fetching user data:", userError);
      throw userError;
    }
    
    if (!userData || !userData.user) {
      console.error("User not found:", request.userId);
      throw new Error(`User not found: ${request.userId}`);
    }
    
    console.log("User found, preparing email content");
    
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
    
    // Attempt to send email via the SMTP sender function
    try {
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
      
      console.log("Email notification sent successfully");
      return smtpResponse;
    } catch (emailSendError) {
      console.error("Failed to send email:", emailSendError);
      // Don't rethrow - continue with the contract signing process even if email fails
      return { success: false, error: emailSendError.message };
    }
  } catch (error) {
    console.error("Error preparing notification email:", error);
    // Don't throw error as this is not critical for the signing process
    return { success: false, error: error.message };
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
  console.log("Sending email via SMTP function");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase credentials for email sending");
    throw new Error("Missing Supabase credentials for email sending");
  }
  
  try {
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
      console.log("Email notification sent successfully via SMTP");
      return smtpResult;
    }
  } catch (error) {
    console.error("Exception sending email via SMTP:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

// Main handler function for the edge function
serve(async (req) => {
  console.log("IziDoc Sign function called:", req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // Parse the request body first to check if it's valid JSON
    let request: SigningRequest;
    try {
      request = await req.json();
      console.log("Request body parsed successfully");
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
    // Initialize Supabase client
    let supabase;
    try {
      supabase = createSupabaseClient();
    } catch (clientError) {
      console.error("Error creating Supabase client:", clientError);
      return new Response(
        JSON.stringify({ error: clientError.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
    
    // Extract IP address from request headers if available
    const forwarded = req.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(/\s*,\s*/)[0] : req.headers.get("cf-connecting-ip") || "";
    console.log("Client IP address:", ipAddress);
    
    // Validate required fields with clear error handling
    try {
      validateRequest(request);
    } catch (validationError) {
      console.error("Validation error:", validationError);
      return new Response(
        JSON.stringify({ error: validationError.message }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
    console.log("Processing digital signature for user:", request.userId);
    
    // Process signature and contract
    let documentId, signatureId, signatureTimestamp;
    try {
      // Store signature in database
      const signatureData = await storeSignature(supabase, request, ipAddress);
      
      // Generate document ID and signature ID
      documentId = signatureData.id;
      signatureId = crypto.randomUUID();
      signatureTimestamp = new Date().toISOString();
      
      console.log("Signature stored with document ID:", documentId);
    } catch (signatureError) {
      console.error("Error storing signature:", signatureError);
      return new Response(
        JSON.stringify({ error: `Signature storage failed: ${signatureError.message}` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
    
    // Update subscription record and continue even if it fails
    try {
      await updateSubscription(supabase, request.userId, request.planId, signatureTimestamp);
    } catch (subscriptionError) {
      console.error("Error updating subscription (continuing anyway):", subscriptionError);
      // Continue processing - we can still succeed overall if this fails
    }
    
    // Send notification email but don't fail if it doesn't work
    try {
      await sendNotificationEmail(supabase, request, signatureTimestamp, ipAddress);
    } catch (emailError) {
      console.error("Error sending notification email (continuing anyway):", emailError);
      // Continue processing - email is not critical for signing success
    }
    
    // Return the signing result
    console.log("Contract signing process completed successfully");
    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        signatureId,
        signedAt: signatureTimestamp
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    // Catch-all for any other errors
    console.error("Unhandled error processing digital signature:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        name: error.name
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
