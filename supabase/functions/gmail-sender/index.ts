
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { google } from "https://esm.sh/googleapis@126.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachmentData?: {
    filename: string;
    content: string; // Base64 encoded content
    mimeType: string;
  }[];
}

async function getAccessToken() {
  const client_id = Deno.env.get("GMAIL_CLIENT_ID");
  const client_secret = Deno.env.get("GMAIL_CLIENT_SECRET");
  const refresh_token = Deno.env.get("GMAIL_REFRESH_TOKEN");

  if (!client_id || !client_secret || !refresh_token) {
    throw new Error("Missing Gmail API credentials");
  }

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
  oauth2Client.setCredentials({ refresh_token });

  try {
    const { token } = await oauth2Client.getAccessToken();
    if (!token) throw new Error("Failed to get access token");
    return token;
  } catch (error) {
    console.error("Error getting access token:", error);
    throw error;
  }
}

async function sendEmail(accessToken: string, emailRequest: EmailRequest) {
  const sender = Deno.env.get("GMAIL_SENDER_EMAIL") || "support@algotouch.co.il";
  
  // Prepare the email content
  let emailContent = `From: ${sender}\r\n`;
  emailContent += `To: ${emailRequest.to}\r\n`;
  emailContent += `Subject: ${emailRequest.subject}\r\n`;
  
  // Create random boundary for multipart message
  const boundary = `boundary-${Math.random().toString().substr(2)}`;
  
  if (emailRequest.attachmentData && emailRequest.attachmentData.length > 0) {
    // Multipart email with attachment
    emailContent += `MIME-Version: 1.0\r\n`;
    emailContent += `Content-Type: multipart/mixed; boundary=${boundary}\r\n\r\n`;
    
    // HTML part
    emailContent += `--${boundary}\r\n`;
    emailContent += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
    emailContent += `${emailRequest.html}\r\n\r\n`;
    
    // Add attachments
    for (const attachment of emailRequest.attachmentData) {
      emailContent += `--${boundary}\r\n`;
      emailContent += `Content-Type: ${attachment.mimeType}\r\n`;
      emailContent += `Content-Disposition: attachment; filename=${attachment.filename}\r\n`;
      emailContent += `Content-Transfer-Encoding: base64\r\n\r\n`;
      emailContent += `${attachment.content}\r\n\r\n`;
    }
    
    emailContent += `--${boundary}--`;
  } else {
    // Simple HTML email
    emailContent += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
    emailContent += emailRequest.html;
  }
  
  // Encode email content for the Gmail API
  const encodedMessage = btoa(emailContent)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodedMessage }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Gmail API error:", errorData);
    throw new Error(`Gmail API error: ${response.status} ${JSON.stringify(errorData)}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    // Only use service role for verification, not for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify the request is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }
    
    // Extract JWT from authorization header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse the request body
    const emailRequest: EmailRequest = await req.json();
    
    if (!emailRequest.to || !emailRequest.subject || !emailRequest.html) {
      throw new Error("Missing required email fields");
    }
    
    console.log("Processing email request:", {
      to: emailRequest.to,
      subject: emailRequest.subject,
      hasAttachments: !!emailRequest.attachmentData?.length
    });
    
    // Get Gmail access token
    const accessToken = await getAccessToken();
    
    // Send the email
    const result = await sendEmail(accessToken, emailRequest);
    
    console.log("Email sent successfully:", result);
    
    // Return the result
    return new Response(JSON.stringify({
      success: true,
      messageId: result.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
