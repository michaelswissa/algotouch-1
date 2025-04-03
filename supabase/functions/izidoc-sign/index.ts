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

serve(async (req) => {
  console.log("IziDoc Sign function called:", req.method, req.url);
  
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
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
    
    const forwarded = req.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(/\s*,\s*/)[0] : req.headers.get("cf-connecting-ip") || "";
    console.log("Client IP address:", ipAddress);
    
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
    
    let documentId, signatureId, signatureTimestamp;
    try {
      const signatureData = await storeSignature(supabase, request, ipAddress);
      
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
    
    try {
      await updateSubscription(supabase, request.userId, request.planId, signatureTimestamp);
      console.log("Subscription updated successfully");
    } catch (subscriptionError) {
      console.error("Error updating subscription (continuing anyway):", subscriptionError);
    }
    
    const encoder = new TextEncoder();
    const contractBytes = encoder.encode(request.contractHtml);
    const contractBase64 = btoa(String.fromCharCode(...new Uint8Array(contractBytes)));
    
    const dateObj = new Date(signatureTimestamp);
    const options = { 
      year: 'numeric', 
      month: 'numeric', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: 'numeric'
    };
    const formattedDateTime = new Intl.DateTimeFormat('he-IL', options).format(dateObj);
    
    console.log("Sending simplified confirmation email to customer:", request.email);
    const customerEmailBody = `
      <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4a90e2;">AlgoTouch</h1>
        </div>
        <p>שלום ${request.fullName},</p>
        <p>אנו מאשרים כי ביום ${formattedDateTime.split(',')[0]} בשעה ${formattedDateTime.split(',')[1]} השלמת את תהליך החתימה הדיגיטלית על ההסכם עם AlgoTouch.</p>
        <p>החתימה בוצעה באופן אלקטרוני, תוך אישור מלא של כל התנאים והסעיפים המפורטים בהסכם, ונרשמה במערכת המאובטחת שלנו.</p>
        <p>לצורך עיון במסמך המלא, ניתן להורידו בעת חתימת ההסכם.</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea;">
          <p>תודה על שיתוף הפעולה,<br>AlgoTouch</p>
        </div>
      </div>
    `;
    
    const customerEmailData = {
      to: request.email,
      subject: `אישור חתימה על הסכם - AlgoTouch`,
      html: customerEmailBody,
      attachmentData: [{
        filename: `contract-algotouch-${new Date().toISOString().slice(0,10)}.html`,
        content: contractBase64,
        mimeType: "text/html"
      }]
    };
    
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
    
    console.log("Sending email to admin");
    const adminEmailBody = `
      <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
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
