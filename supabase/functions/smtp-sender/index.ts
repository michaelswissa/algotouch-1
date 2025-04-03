
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
  replyTo?: string;
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
    console.log("--- SMTP-SENDER FUNCTION CALLED ---");
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.url}`);
    
    // Get SMTP configuration from environment variables
    const smtp_host = Deno.env.get("SMTP_HOST");
    const smtp_port = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtp_user = Deno.env.get("SMTP_USER");
    const smtp_pass = Deno.env.get("SMTP_PASSWORD");
    const smtp_from = Deno.env.get("SMTP_FROM") || "support@algotouch.co.il";
    
    // Check if all required SMTP credentials are provided
    if (!smtp_host || !smtp_user || !smtp_pass) {
      console.error("Missing SMTP credentials");
      const missing = [];
      if (!smtp_host) missing.push("SMTP_HOST");
      if (!smtp_user) missing.push("SMTP_USER");
      if (!smtp_pass) missing.push("SMTP_PASSWORD");
      
      throw new Error(`Missing SMTP credentials: ${missing.join(", ")}`);
    }
    
    console.log("SMTP configuration found:");
    console.log(`- Host: ${smtp_host}`);
    console.log(`- Port: ${smtp_port}`);
    console.log(`- User: ${smtp_user}`);
    console.log(`- From: ${smtp_from}`);
    
    // Parse the request body
    const emailRequest: EmailRequest = await req.json();
    
    if (!emailRequest.to || !emailRequest.subject || !emailRequest.html) {
      console.error("Missing required email fields");
      throw new Error("Missing required email fields (to, subject, or html)");
    }
    
    console.log(`Sending email to ${emailRequest.to} with subject: ${emailRequest.subject}`);
    
    // Create an SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: smtp_host,
        port: smtp_port,
        tls: true,
        auth: {
          username: smtp_user,
          password: smtp_pass,
        },
      },
      debug: {
        logger: true,
      },
    });

    // Prepare attachments if any
    const attachments = [];
    if (emailRequest.attachmentData && emailRequest.attachmentData.length > 0) {
      console.log(`Processing ${emailRequest.attachmentData.length} attachments`);
      
      for (const attachment of emailRequest.attachmentData) {
        try {
          const content = Uint8Array.from(atob(attachment.content), c => c.charCodeAt(0));
          attachments.push({
            filename: attachment.filename,
            contentType: attachment.mimeType,
            content: content,
          });
          console.log(`Processed attachment: ${attachment.filename}, size: ${content.length} bytes`);
        } catch (err) {
          console.error(`Error processing attachment ${attachment.filename}:`, err);
          throw new Error(`Failed to process attachment ${attachment.filename}: ${err.message}`);
        }
      }
      
      console.log(`Successfully processed ${attachments.length} attachments`);
    }
    
    // Prepare email options
    const emailOptions: any = {
      from: smtp_from,
      to: emailRequest.to,
      subject: emailRequest.subject,
      html: emailRequest.html,
    };
    
    // Add text content if specified
    if (emailRequest.text) {
      emailOptions.text = emailRequest.text;
    }
    
    // Add attachments if any
    if (attachments.length > 0) {
      emailOptions.attachments = attachments;
    }
    
    // Add reply-to if specified
    if (emailRequest.replyTo) {
      emailOptions.replyTo = emailRequest.replyTo;
    }
    
    // Log email sending attempt
    console.log(`Sending email with options:`, JSON.stringify({
      from: emailOptions.from,
      to: emailOptions.to,
      subject: emailOptions.subject,
      hasHtml: !!emailOptions.html,
      hasText: !!emailOptions.text,
      attachmentsCount: attachments.length,
      hasReplyTo: !!emailOptions.replyTo
    }));
    
    // Send the email
    const sendResult = await client.send(emailOptions);
    console.log("Email sent with result:", sendResult);
    
    // Close the connection
    await client.close();
    
    console.log("Email sent successfully and connection closed");
    
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: "Email sent successfully",
      result: sendResult
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      name: error.name
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
