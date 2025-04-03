
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
      console.log("Subscription updated successfully");
    } catch (subscriptionError) {
      console.error("Error updating subscription (continuing anyway):", subscriptionError);
      // Continue processing - we can still succeed overall if this fails
    }
    
    // Convert HTML contract to base64 for attachment
    const encoder = new TextEncoder();
    const contractBytes = encoder.encode(request.contractHtml);
    const contractBase64 = btoa(String.fromCharCode(...new Uint8Array(contractBytes)));
    
    // Prepare email for customer
    console.log("Sending email to customer:", request.email);
    const customerEmailBody = `
      <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; color: #333;">
        <h1>תודה שחתמת על ההסכם</h1>
        <p>שלום ${request.fullName},</p>
        <p>תודה שחתמת על הסכם ההצטרפות לשירות AlgoTouch.</p>
        <p>פרטי החתימה:</p>
        <ul>
          <li>זמן חתימה: ${signatureTimestamp}</li>
          <li>תכנית: ${request.planId === 'monthly' ? 'חודשית' : 'שנתית'}</li>
        </ul>
        <p>מצורף העתק של החוזה החתום.</p>
        <p>לכל שאלה, ניתן לפנות אלינו ב-support@algotouch.co.il</p>
        <p>בברכה,<br>צוות AlgoTouch</p>
      </div>
    `;
    
    // Prepare email data for customer
    const customerEmailData = {
      to: request.email,
      subject: `העתק הסכם AlgoTouch - אישור חתימה`,
      html: customerEmailBody,
      attachmentData: [{
        filename: `contract-algotouch-${new Date().toISOString().slice(0,10)}.html`,
        content: contractBase64,
        mimeType: "text/html"
      }]
    };
    
    // Send email to customer
    let customerEmailResult;
    try {
      console.log("Sending email to customer via smtp-sender function");
      const { data: emailData, error: emailError } = await supabase.functions.invoke('smtp-sender', {
        body: customerEmailData
      });
      
      if (emailError) {
        console.error("Error sending customer email:", emailError);
        customerEmailResult = { success: false, error: emailError.message };
      } else {
        console.log("Customer email sent successfully:", emailData);
        customerEmailResult = { success: true, result: emailData };
      }
    } catch (emailError) {
      console.error("Exception sending customer email:", emailError);
      customerEmailResult = { success: false, error: emailError.message };
    }
    
    // Prepare email for admin
    console.log("Sending email to admin");
    const adminEmailBody = `
      <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; color: #333;">
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
      </div>
    `;
    
    // Prepare email data for admin
    const adminEmailData = {
      to: "support@algotouch.co.il",
      subject: `הסכם חדש נחתם - ${request.fullName}`,
      html: adminEmailBody,
      attachmentData: [{
        filename: `contract-${request.fullName}-${new Date().toISOString().slice(0,10)}.html`,
        content: contractBase64,
        mimeType: "text/html"
      }]
    };
    
    // Send email to admin
    let adminEmailResult;
    try {
      console.log("Sending email to admin via smtp-sender function");
      const { data: emailData, error: emailError } = await supabase.functions.invoke('smtp-sender', {
        body: adminEmailData
      });
      
      if (emailError) {
        console.error("Error sending admin email:", emailError);
        adminEmailResult = { success: false, error: emailError.message };
      } else {
        console.log("Admin email sent successfully:", emailData);
        adminEmailResult = { success: true, result: emailData };
      }
    } catch (emailError) {
      console.error("Exception sending admin email:", emailError);
      adminEmailResult = { success: false, error: emailError.message };
    }
    
    // Return the signing result
    console.log("Contract signing process completed");
    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        signatureId,
        signedAt: signatureTimestamp,
        emailToCustomer: customerEmailResult,
        emailToAdmin: adminEmailResult
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
