
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded content
  mimeType: string;
}

interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachmentData?: EmailAttachment[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = Deno.env.get("SMTP_PORT");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.error("Missing SMTP configuration");
      throw new Error("Server configuration error: Missing SMTP settings");
    }

    // Parse request
    let emailData: EmailRequest;
    try {
      emailData = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request JSON:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Validate required fields
    if (!emailData.to || !emailData.subject || !emailData.html) {
      console.error("Missing required email fields:", emailData);
      return new Response(
        JSON.stringify({ success: false, error: "Missing required email fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Connect to SMTP server
    const client = new SmtpClient();
    await client.connectTLS({
      hostname: smtpHost,
      port: parseInt(smtpPort),
      username: smtpUser,
      password: smtpPass,
    });

    // Process attachments if present
    const attachments = [];
    if (emailData.attachmentData && Array.isArray(emailData.attachmentData)) {
      for (const attachment of emailData.attachmentData) {
        try {
          const binaryContent = Uint8Array.from(atob(attachment.content), c => c.charCodeAt(0));
          attachments.push({
            filename: attachment.filename,
            content: binaryContent,
            contentType: attachment.mimeType,
          });
        } catch (attachError) {
          console.error(`Error processing attachment ${attachment.filename}:`, attachError);
        }
      }
    }

    // Send email
    console.log(`Sending email to ${typeof emailData.to === 'string' ? emailData.to : emailData.to.join(', ')}`);
    await client.send({
      from: smtpUser,
      to: emailData.to,
      subject: emailData.subject,
      content: emailData.text || emailData.html,
      html: emailData.html,
      attachments,
    });

    await client.close();

    console.log("Email sent successfully");
    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
