
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
    
    if (!smtp_host || !smtp_user || !smtp_pass) {
      const missing = [];
      if (!smtp_host) missing.push("SMTP_HOST");
      if (!smtp_user) missing.push("SMTP_USER");
      if (!smtp_pass) missing.push("SMTP_PASSWORD");
      
      throw new Error(`Missing SMTP credentials: ${missing.join(", ")}`);
    }
    
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
      // Enable debug logging
      debug: {
        logger: true,
      },
    });

    console.log("SMTP client created, attempting connection test...");
    
    try {
      // Basic connection test - Just connects and closes
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
      throw new Error(`SMTP connection failed: ${connError.message}`);
    } finally {
      try {
        await client.close();
      } catch (e) {
        // Ignore close errors
      }
    }
  } catch (error) {
    console.error("Error testing SMTP:", error);
    
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
