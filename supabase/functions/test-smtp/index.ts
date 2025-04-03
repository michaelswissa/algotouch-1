
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    console.log("--- TEST-SMTP FUNCTION CALLED ---");
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.url}`);
    
    // Get SMTP configuration from environment variables
    const smtp_host = Deno.env.get("SMTP_HOST");
    const smtp_port = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtp_user = Deno.env.get("SMTP_USER");
    const smtp_pass = Deno.env.get("SMTP_PASSWORD");
    const smtp_from = Deno.env.get("SMTP_FROM") || "support@algotouch.co.il";
    
    // Print environment variables for debugging
    console.log("Environment variables:");
    console.log(`SMTP_HOST: ${smtp_host ? "✓" : "✗"}`);
    console.log(`SMTP_PORT: ${Deno.env.get("SMTP_PORT") ? "✓" : "✗"}`);
    console.log(`SMTP_USER: ${smtp_user ? "✓" : "✗"}`);
    console.log(`SMTP_PASSWORD: ${smtp_pass ? "✓" : "✗"}`);
    console.log(`SMTP_FROM: ${smtp_from ? "✓" : "✗"}`);
    
    if (!smtp_host || !smtp_user || !smtp_pass) {
      throw new Error("Missing SMTP credentials");
    }
    
    // Create SMTP client
    try {
      console.log("Creating SMTP client...");
      console.log(`Host: ${smtp_host}, Port: ${smtp_port}`);
      
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
      
      console.log("SMTP client created successfully");
      
      // Test connection
      console.log("Testing SMTP connection...");
      
      try {
        // Send a test email to ourselves
        const result = await client.send({
          from: smtp_from,
          to: "support@algotouch.co.il",
          subject: "SMTP Test Connection",
          content: "This is a test email to verify SMTP settings.",
          html: `<div>SMTP test email sent at ${new Date().toLocaleString()}</div>`,
        });
        
        console.log("Test email sent successfully:", result);
        
        // Close connection
        await client.close();
        console.log("SMTP connection closed");
        
        return new Response(JSON.stringify({
          success: true,
          message: "SMTP connection test successful",
          result
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } catch (sendError) {
        console.error("Error sending test email:", sendError);
        
        try {
          await client.close();
          console.log("SMTP connection closed after error");
        } catch (closeError) {
          console.error("Error closing SMTP connection:", closeError);
        }
        
        throw new Error(`SMTP send failed: ${sendError.message}`);
      }
    } catch (clientError) {
      console.error("Error creating SMTP client:", clientError);
      throw new Error(`SMTP client creation failed: ${clientError.message}`);
    }
  } catch (error) {
    console.error("Error in test-smtp function:", error);
    
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
