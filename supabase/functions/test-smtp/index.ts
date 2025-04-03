
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    console.log("--- SMTP TEST FUNCTION CALLED ---");
    
    // Get SMTP configuration from environment variables
    const smtp_host = Deno.env.get("SMTP_HOST");
    const smtp_port = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtp_user = Deno.env.get("SMTP_USER");
    const smtp_pass = Deno.env.get("SMTP_PASSWORD");
    const smtp_from = Deno.env.get("SMTP_FROM") || "noreply@algotouch.co.il";
    
    // Check if all required SMTP credentials are provided
    if (!smtp_host || !smtp_user || !smtp_pass) {
      console.error("Missing SMTP credentials");
      const missing = [];
      if (!smtp_host) missing.push("SMTP_HOST");
      if (!smtp_user) missing.push("SMTP_USER");
      if (!smtp_pass) missing.push("SMTP_PASSWORD");
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Missing SMTP credentials: ${missing.join(", ")}`,
          config: {
            host: smtp_host ? "✓" : "✗",
            port: smtp_port ? "✓" : "✗",
            user: smtp_user ? "✓" : "✗",
            pass: smtp_pass ? "✓" : "✗",
            from: smtp_from ? "✓" : "✗",
          }
        }), 
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
    console.log("SMTP configuration found:");
    console.log(`- Host: ${smtp_host}`);
    console.log(`- Port: ${smtp_port}`);
    console.log(`- User: ${smtp_user}`);
    console.log(`- From: ${smtp_from}`);
    
    // Create an SMTP client
    console.log("Creating SMTP client and testing connection...");
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

    // Test connection - just connect and close
    try {
      console.log("Connecting to SMTP server...");
      await client.connect();
      console.log("SMTP connection successful");
      
      // Close connection after successful test
      await client.close();
      console.log("SMTP connection closed");
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "SMTP connection test successful",
          config: {
            host: smtp_host,
            port: smtp_port,
            user: smtp_user,
            from: smtp_from
          }
        }), 
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (connectionError) {
      console.error("Error connecting to SMTP server:", connectionError);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Connection error: ${connectionError.message}`,
          details: connectionError,
          config: {
            host: smtp_host,
            port: smtp_port,
            user: smtp_user,
            from: smtp_from
          }
        }), 
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
  } catch (error) {
    console.error("Unhandled error in SMTP test:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Unhandled error: ${error.message}`,
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
