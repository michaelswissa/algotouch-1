
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
    console.log("--- SMTP SENDER FUNCTION CALLED ---");
    
    // Get SMTP configuration from environment variables
    const smtp_host = Deno.env.get("SMTP_HOST");
    const smtp_port = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtp_user = Deno.env.get("SMTP_USER");
    const smtp_pass = Deno.env.get("SMTP_PASSWORD");
    const smtp_from = Deno.env.get("SMTP_FROM") || "noreply@algotouch.co.il";
    
    // Log SMTP configuration
    console.log("SMTP Configuration:");
    console.log(`Host: ${smtp_host || "MISSING"}`);
    console.log(`Port: ${smtp_port}`);
    console.log(`User: ${smtp_user || "MISSING"}`);
    console.log(`From: ${smtp_from}`);
    
    // Check if SMTP is properly configured
    if (!smtp_host || !smtp_user || !smtp_pass) {
      const missing = [];
      if (!smtp_host) missing.push("SMTP_HOST");
      if (!smtp_user) missing.push("SMTP_USER");
      if (!smtp_pass) missing.push("SMTP_PASSWORD");
      
      throw new Error(`SMTP not configured properly. Missing: ${missing.join(", ")}`);
    }
    
    // Parse request body
    const emailRequest: EmailRequest = await req.json();
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
      
      throw new Error(`Invalid email request. Missing: ${missing.join(", ")}`);
    }
    
    // Create SMTP client
    console.log("Creating SMTP client");
    const client = new SMTPClient({
      connection: {
        hostname: smtp_host,
        port: smtp_port,
        tls: true,
        auth: {
          username: smtp_user,
          password: smtp_pass,
        },
        timeout: 30000, // 30 seconds
      },
      debug: { logger: true }
    });
    
    // Prepare email
    const email: any = {
      from: smtp_from,
      to: emailRequest.to,
      subject: emailRequest.subject,
      html: emailRequest.html,
      content: emailRequest.text
    };
    
    // Add attachments if they exist
    if (emailRequest.attachmentData && emailRequest.attachmentData.length > 0) {
      console.log(`Processing ${emailRequest.attachmentData.length} attachments`);
      
      email.attachments = emailRequest.attachmentData.map(attachment => ({
        filename: attachment.filename,
        content: Uint8Array.from(atob(attachment.content), c => c.charCodeAt(0)),
        contentType: attachment.mimeType,
      }));
    }
    
    // Connect to SMTP server
    console.log("Connecting to SMTP server");
    await client.connect();
    
    try {
      // Send email
      console.log("Sending email");
      const info = await client.send(email);
      console.log("Email sent successfully:", info);
      
      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          messageId: info.messageId,
          sent: true
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } finally {
      // Always close the connection
      try {
        await client.close();
        console.log("SMTP connection closed");
      } catch (closeError) {
        console.warn("Error closing SMTP connection:", closeError);
      }
    }
  } catch (error) {
    console.error("Error sending email:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        details: {
          name: error.name,
          code: error.code
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
