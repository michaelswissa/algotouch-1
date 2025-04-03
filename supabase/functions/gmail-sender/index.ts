
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    console.log("--- GMAIL SENDER FUNCTION CALLED ---");
    
    // Get Gmail API configuration from environment variables
    const gmail_client_id = Deno.env.get("GMAIL_CLIENT_ID");
    const gmail_client_secret = Deno.env.get("GMAIL_CLIENT_SECRET");
    const gmail_refresh_token = Deno.env.get("GMAIL_REFRESH_TOKEN");
    const gmail_from = Deno.env.get("GMAIL_FROM") || "noreply@algotouch.co.il";
    
    // Log Gmail configuration (without sensitive details)
    console.log("Gmail Configuration:");
    console.log(`Client ID: ${gmail_client_id ? "Provided" : "MISSING"}`);
    console.log(`Client Secret: ${gmail_client_secret ? "Provided" : "MISSING"}`);
    console.log(`Refresh Token: ${gmail_refresh_token ? "Provided" : "MISSING"}`);
    console.log(`From: ${gmail_from}`);
    
    // Check if Gmail is properly configured
    if (!gmail_client_id || !gmail_client_secret || !gmail_refresh_token) {
      const missing = [];
      if (!gmail_client_id) missing.push("GMAIL_CLIENT_ID");
      if (!gmail_client_secret) missing.push("GMAIL_CLIENT_SECRET");
      if (!gmail_refresh_token) missing.push("GMAIL_REFRESH_TOKEN");
      
      const errorMessage = `Gmail not configured properly. Missing: ${missing.join(", ")}`;
      console.error(errorMessage);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          details: {
            clientId: gmail_client_id ? "✓" : "✗",
            clientSecret: gmail_client_secret ? "✓" : "✗",
            refreshToken: gmail_refresh_token ? "✓" : "✗",
            from: gmail_from ? "✓" : "✗"
          }
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
    // Parse request body
    let emailRequest: EmailRequest;
    try {
      emailRequest = await req.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON request body",
          details: parseError.message
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
    console.log("Email request received:", {
      to: emailRequest.to,
      subject: emailRequest.subject,
      hasAttachments: !!emailRequest.attachmentData?.length
    });
    
    // Validate email request
    if (!emailRequest.to || !emailRequest.subject || !emailRequest.html) {
      const missing = [];
      if (!emailRequest.to) missing.push("to");
      if (!emailRequest.subject) missing.push("subject");
      if (!emailRequest.html) missing.push("html");
      
      const errorMessage = `Invalid email request. Missing: ${missing.join(", ")}`;
      console.error(errorMessage);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
    // Get an access token using the refresh token
    console.log("Getting Gmail access token");
    let accessToken;
    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: gmail_client_id,
          client_secret: gmail_client_secret,
          refresh_token: gmail_refresh_token,
          grant_type: "refresh_token",
        }),
      });
      
      if (!tokenResponse.ok) {
        const tokenError = await tokenResponse.text();
        throw new Error(`Failed to get access token: ${tokenError}`);
      }
      
      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;
      
      if (!accessToken) {
        throw new Error("Access token not received from Google");
      }
      
      console.log("Access token obtained successfully");
    } catch (tokenError) {
      console.error("Error getting access token:", tokenError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to get Gmail access token",
          details: tokenError.message
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
    
    // Prepare email
    console.log("Preparing email MIME message");
    let emailMessage: string;
    
    try {
      // Create an RFC 2822 MIME message
      const boundary = "boundary" + Math.random().toString().slice(2);
      
      // Email headers
      let mimeMessage = [
        `From: ${gmail_from}`,
        `To: ${emailRequest.to}`,
        `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(emailRequest.subject)))}?=`,
        "MIME-Version: 1.0",
        `Content-Type: multipart/mixed; boundary=${boundary}`,
        "",
        `--${boundary}`,
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "",
        btoa(unescape(encodeURIComponent(emailRequest.html))),
      ].join("\r\n");
      
      // Add attachments if they exist
      if (emailRequest.attachmentData && emailRequest.attachmentData.length > 0) {
        for (const attachment of emailRequest.attachmentData) {
          mimeMessage += [
            "",
            `--${boundary}`,
            `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
            "Content-Transfer-Encoding: base64",
            `Content-Disposition: attachment; filename="${attachment.filename}"`,
            "",
            attachment.content,
          ].join("\r\n");
        }
      }
      
      // End of MIME message
      mimeMessage += `\r\n--${boundary}--`;
      
      // Encode the MIME message as base64url
      emailMessage = btoa(mimeMessage)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    } catch (mimeError) {
      console.error("Error creating MIME message:", mimeError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create email MIME message",
          details: mimeError.message
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
    
    // Send the email via Gmail API
    console.log("Sending email via Gmail API");
    try {
      const gmailResponse = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw: emailMessage,
        }),
      });
      
      if (!gmailResponse.ok) {
        const gmailError = await gmailResponse.text();
        throw new Error(`Gmail API error: ${gmailError}`);
      }
      
      const gmailData = await gmailResponse.json();
      console.log("Email sent successfully via Gmail:", gmailData);
      
      return new Response(
        JSON.stringify({
          success: true,
          messageId: gmailData.id,
          sent: true
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (sendError) {
      console.error("Error sending email via Gmail API:", sendError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send email via Gmail API",
          details: sendError.message
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
  } catch (error) {
    console.error("Unhandled error in Gmail sender function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Unhandled error in Gmail sender function",
        details: {
          message: error.message,
          name: error.name,
          stack: error.stack
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
