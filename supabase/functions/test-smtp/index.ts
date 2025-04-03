
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
    
    // Get SMTP configuration from environment variables
    const smtp_host = Deno.env.get("SMTP_HOST");
    const smtp_port = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtp_user = Deno.env.get("SMTP_USER");
    const smtp_pass = Deno.env.get("SMTP_PASSWORD");
    const smtp_from = Deno.env.get("SMTP_FROM") || "noreply@algotouch.co.il";
    
    // Log configuration (but not password)
    console.log("SMTP Configuration:");
    console.log(`Host: ${smtp_host || "missing"}`);
    console.log(`Port: ${smtp_port}`);
    console.log(`User: ${smtp_user || "missing"}`);
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
          status: 400,
        }
      );
    }
    
    try {
      // Create a simplified SMTP client with fewer options
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

      // Test connection
      console.log("Testing SMTP connection...");
      await client.connect();
      console.log("SMTP connection successful!");
      await client.close();
      
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
    } catch (error) {
      console.error("SMTP connection error:", error.message);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `SMTP connection failed: ${error.message}`,
          errorDetails: {
            type: error.name,
            code: error.code,
            stack: error.stack
          },
          config: {
            host: smtp_host,
            port: smtp_port,
            user: smtp_user,
            from: smtp_from,
          }
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
