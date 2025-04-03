
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

// Send contract copy to both support and customer
async function sendContractEmails(
  supabase: any, 
  request: SigningRequest, 
  signatureTimestamp: string,
  ipAddress: string
) {
  console.log("Sending contract emails to support and customer");
  
  // First send to support
  await sendEmailToSupport(supabase, request, signatureTimestamp, ipAddress);
  
  // Then send to customer
  await sendEmailToCustomer(supabase, request);
}

// Send contract notification to support
async function sendEmailToSupport(
  supabase: any, 
  request: SigningRequest, 
  signatureTimestamp: string,
  ipAddress: string
) {
  console.log("Preparing to send contract notification email to support");
  try {
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
      
      console.log("Support email notification sent successfully");
      return smtpResponse;
    } catch (emailSendError) {
      console.error("Failed to send email to support:", emailSendError);
      // Continue with the contract signing process even if email fails
      return { success: false, error: emailSendError.message };
    }
  } catch (error) {
    console.error("Error preparing support email:", error);
    // Continue with the contract signing process even if email fails
    return { success: false, error: error.message };
  }
}

// Send contract copy to customer
async function sendEmailToCustomer(
  supabase: any, 
  request: SigningRequest
) {
  console.log(`Preparing to send contract confirmation email to customer: ${request.email}`);
  try {
    // Convert HTML contract to base64 for attachment
    const encoder = new TextEncoder();
    const contractBytes = encoder.encode(request.contractHtml);
    const contractBase64 = btoa(String.fromCharCode(...new Uint8Array(contractBytes)));
    
    const planName = request.planId === 'monthly' ? 'חודשית' : 'שנתית';
    
    const emailBody = `
      <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4a90e2;">AlgoTouch</h1>
          <p style="font-size: 18px; color: #666;">פלטפורמת המסחר החכמה</p>
        </div>
        <h2>שלום ${request.fullName},</h2>
        <p>תודה על הצטרפותך ל-AlgoTouch!</p>
        <p>אנו שמחים לאשר שהחוזה לתכנית ה${planName} נחתם בהצלחה.</p>
        <p>מצורף העתק של החוזה החתום לשמירה.</p>
        <p>אנו מאחלים לך הצלחה רבה ובטוחים שתפיק תועלת מהכלים שלנו!</p>
        <p>לכל שאלה או בקשה, אנא פנה אלינו בכתובת: <a href="mailto:support@algotouch.co.il">support@algotouch.co.il</a></p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; font-size: 14px; color: #666;">
          <p>בברכה,<br>צוות AlgoTouch</p>
        </div>
      </div>
    `;

    console.log(`Sending contract copy to customer email: ${request.email}`);
    
    // Send email via the SMTP sender function
    try {
      const smtpResponse = await sendEmailViaSmtp(
        supabase,
        request.email,
        `AlgoTouch - אישור הצטרפות והעתק הסכם חתום`,
        emailBody,
        [{
          filename: `contract-algotouch-${request.planId}.html`,
          content: contractBase64,
          mimeType: "text/html"
        }]
      );
      
      console.log("Customer email sent successfully");
      return smtpResponse;
    } catch (emailSendError) {
      console.error("Failed to send email to customer:", emailSendError);
      // Continue with the contract signing process even if email fails
      return { success: false, error: emailSendError.message };
    }
  } catch (error) {
    console.error("Error preparing customer email:", error);
    // Continue with the contract signing process even if email fails
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
  console.log(`Sending email via SMTP function to: ${to}`);
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
      console.log(`Email notification sent successfully to ${to}`);
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
    
    // Update subscription record
    try {
      await updateSubscription(supabase, request.userId, request.planId, signatureTimestamp);
    } catch (subscriptionError) {
      console.error("Error updating subscription:", subscriptionError);
      // Continue processing even if this fails
    }
    
    // Send contract emails to both support and customer in background
    try {
      await sendContractEmails(supabase, request, signatureTimestamp, ipAddress);
    } catch (emailError) {
      console.error("Error sending contract emails:", emailError);
      // Continue processing even if email sending fails
    }
    
    // Return the signing result - indicating success even if emails failed
    // as we've stored the signature data
    console.log("Contract signing process completed successfully");
    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        signatureId,
        signedAt: signatureTimestamp,
        message: "Contract signed and emails sent"
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
