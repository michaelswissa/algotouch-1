
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
    const smtp_from = Deno.env.get("SMTP_FROM") || "noreply@algotouch.co.il";
    
    // Dump configuration (exclude password)
    console.log("SMTP Configuration:");
    console.log(`Host: ${smtp_host}`);
    console.log(`Port: ${smtp_port}`);
    console.log(`User: ${smtp_user}`);
    console.log(`From: ${smtp_from}`);
    
    // Check for required env variables
    const requiredEnvVars = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"];
    const missingEnvVars = requiredEnvVars.filter(envVar => !Deno.env.get(envVar));
    
    if (missingEnvVars.length > 0) {
      const errorMessage = `Missing SMTP credentials: ${missingEnvVars.join(", ")}`;
      console.error(errorMessage);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          config: {
            host: smtp_host ? "✓" : "✗",
            port: smtp_port ? "✓" : "✗",
            user: smtp_user ? "✓" : "✗",
            pass: smtp_pass ? "✓" : "✗",
            from: smtp_from ? "✓" : "✗"
          }
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400, // Return a 400 status for configuration issues
        }
      );
    }
    
    // Create an SMTP client
    console.log("Creating SMTP client with the following configuration:");
    console.log(`Host: ${smtp_host}, Port: ${smtp_port}, User: ${smtp_user}, TLS: true`);
    
    const client = new SMTPClient({
      connection: {
        hostname: smtp_host,
        port: smtp_port,
        tls: true,
        auth: {
          username: smtp_user,
          password: smtp_pass,
        },
        // Add timeout options
        timeout: 30000, // 30 seconds
      },
      // Enable debug logging
      debug: {
        logger: true,
      },
    });

    console.log("SMTP client created, attempting connection test...");
    
    try {
      // Basic connection test - Just connects and closes
      console.log("Attempting to connect to SMTP server...");
      await client.connect();
      console.log("SMTP connection successful!");
      await client.close();
      console.log("SMTP connection closed properly");
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "SMTP connection test successful",
          config: {
            host: smtp_host,
            port: smtp_port,
            user: smtp_user,
            from: smtp_from,
          }
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (connError) {
      console.error("SMTP connection test failed:", connError);
      console.error("Error details:", JSON.stringify({
        message: connError.message,
        name: connError.name,
        stack: connError.stack,
        code: connError.code
      }));
      
      // Provide detailed error information
      return new Response(
        JSON.stringify({
          success: false,
          error: `SMTP connection failed: ${connError.message}`,
          errorType: connError.name,
          errorCode: connError.code,
          details: "Check your SMTP settings, especially host, port, and credentials",
          config: {
            host: smtp_host,
            port: smtp_port,
            user: smtp_user,
            from: smtp_from,
          }
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400, // Return a 400 status for SMTP connection issues
        }
      );
    } finally {
      try {
        await client.close();
      } catch (e) {
        // Ignore close errors
        console.log("Note: SMTP connection may already be closed");
      }
    }
  } catch (error) {
    console.error("Error testing SMTP:", error);
    console.error("Error details:", JSON.stringify({
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: error.code
    }));
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        errorType: error.name,
        stack: error.stack,
        code: error.code,
        message: "There was an unexpected error processing your request"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
