
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
    
    // Get all environment variables for debugging
    const envVars = {};
    for (const key of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"]) {
      envVars[key] = {
        value: Deno.env.get(key) ? (key.includes("PASSWORD") ? "********" : Deno.env.get(key)) : null,
        exists: !!Deno.env.get(key)
      };
    }
    
    console.log("Environment variables:", JSON.stringify(envVars, null, 2));
    
    // Get SMTP configuration from environment variables
    const smtp_host = Deno.env.get("SMTP_HOST");
    const smtp_port = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtp_user = Deno.env.get("SMTP_USER");
    const smtp_pass = Deno.env.get("SMTP_PASSWORD");
    const smtp_from = Deno.env.get("SMTP_FROM") || smtp_user;
    
    // Validate configuration
    const missingVars = [];
    if (!smtp_host) missingVars.push("SMTP_HOST");
    if (!smtp_user) missingVars.push("SMTP_USER");
    if (!smtp_pass) missingVars.push("SMTP_PASSWORD");
    
    if (missingVars.length > 0) {
      const errorMsg = `Missing SMTP credentials: ${missingVars.join(", ")}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    console.log("Creating SMTP client configuration:");
    console.log(`Host: ${smtp_host}, Port: ${smtp_port}, User: ${smtp_user}, From: ${smtp_from}`);
    
    // Test connection only first
    try {
      console.log("Creating SMTP client...");
      
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
      
      console.log("SMTP client created successfully, testing connection...");
      
      // First, try a connection test without sending
      try {
        await client.connect();
        console.log("SMTP connection test successful");
        await client.close();
        console.log("SMTP connection closed after successful test");
      } catch (connError) {
        console.error("SMTP connection test failed:", connError);
        throw new Error(`SMTP connection failed: ${connError.message}`);
      }
      
      // If connection worked, try sending a test email
      console.log("Now attempting to send a test email...");
      
      const testClient = new SMTPClient({
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
      
      try {
        // Send a test email to support@algotouch.co.il
        const result = await testClient.send({
          from: smtp_from,
          to: "support@algotouch.co.il",
          subject: "SMTP Test Connection",
          content: "This is a test email to verify SMTP settings.",
          html: `<div>SMTP test email sent at ${new Date().toLocaleString()}</div>`,
        });
        
        console.log("Test email sent successfully:", result);
        
        // Close connection
        await testClient.close();
        console.log("SMTP connection closed after sending test email");
        
        return new Response(JSON.stringify({
          success: true,
          message: "SMTP connection and email test successful",
          result,
          config: {
            host: smtp_host,
            port: smtp_port,
            user: smtp_user,
            from: smtp_from
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } catch (sendError) {
        console.error("Error sending test email:", sendError);
        
        try {
          await testClient.close();
          console.log("SMTP connection closed after error");
        } catch (closeError) {
          console.error("Error closing SMTP connection:", closeError);
        }
        
        throw new Error(`SMTP email send failed: ${sendError.message}`);
      }
    } catch (clientError) {
      console.error("Error with SMTP client:", clientError);
      throw new Error(`SMTP client error: ${clientError.message}`);
    }
  } catch (error) {
    console.error("Error in test-smtp function:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      name: error.name,
      details: "Check that your SMTP credentials are correct and that the server allows connections."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
