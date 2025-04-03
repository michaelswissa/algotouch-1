
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { google } from "https://esm.sh/googleapis@126.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function getAccessToken() {
  const client_id = Deno.env.get("GMAIL_CLIENT_ID");
  const client_secret = Deno.env.get("GMAIL_CLIENT_SECRET");
  const refresh_token = Deno.env.get("GMAIL_REFRESH_TOKEN");

  if (!client_id || !client_secret || !refresh_token) {
    throw new Error(`Missing Gmail API credentials:
      Client ID: ${client_id ? "✓" : "✗"}
      Client Secret: ${client_secret ? "✓" : "✗"}
      Refresh Token: ${refresh_token ? "✓" : "✗"}`);
  }

  console.log("Using Gmail credentials:");
  console.log(`- Client ID: ${client_id.substring(0, 8)}...`);
  console.log(`- Refresh Token starts with: ${refresh_token.substring(0, 8)}...`);

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
  oauth2Client.setCredentials({ refresh_token });

  try {
    console.log("Attempting to get access token from Google...");
    const { token, res } = await oauth2Client.getAccessToken();
    
    if (!token) throw new Error("Failed to get access token");
    
    console.log("Access token obtained successfully!");
    console.log(`- Token starts with: ${token.substring(0, 8)}...`);
    console.log(`- Response status: ${res?.status}`);
    
    return { token, tokenInfo: res?.data };
  } catch (error) {
    console.error("Error getting access token:", error);
    throw error;
  }
}

async function sendTestEmail(accessToken: string) {
  const sender = Deno.env.get("GMAIL_SENDER_EMAIL") || "support@algotouch.co.il";
  const testReceiver = "support@algotouch.co.il";
  
  // Simple test email content
  let emailContent = `From: ${sender}\r\n`;
  emailContent += `To: ${testReceiver}\r\n`;
  emailContent += `Subject: Gmail API Test ${new Date().toISOString()}\r\n`;
  emailContent += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
  emailContent += `<h1>Gmail API Test Email</h1>
    <p>This is a test email sent at ${new Date().toLocaleString()}.</p>
    <p>If you're receiving this, the Gmail API integration is working correctly!</p>`;
  
  // Encode email content for the Gmail API
  const encodedMessage = btoa(emailContent)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  console.log(`Sending test email from ${sender} to ${testReceiver}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encodedMessage }),
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error("Gmail API error:", response.status, responseText);
      throw new Error(`Gmail API error: ${response.status} ${responseText}`);
    }

    try {
      return JSON.parse(responseText);
    } catch (e) {
      return { raw: responseText };
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error("Request timed out after 15 seconds");
      throw new Error("Gmail API request timed out after 15 seconds");
    }
    console.error("Error sending test email:", error);
    throw error;
  }
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
    console.log("--- TEST-GMAIL FUNCTION CALLED ---");
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.url}`);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
    
    const envVars = {
      GMAIL_CLIENT_ID: !!Deno.env.get("GMAIL_CLIENT_ID"),
      GMAIL_CLIENT_SECRET: !!Deno.env.get("GMAIL_CLIENT_SECRET"),
      GMAIL_REFRESH_TOKEN: !!Deno.env.get("GMAIL_REFRESH_TOKEN"),
      GMAIL_SENDER_EMAIL: !!Deno.env.get("GMAIL_SENDER_EMAIL"),
    };
    
    console.log("Environment variables present:", envVars);
    
    // Get Gmail access token
    const { token, tokenInfo } = await getAccessToken();
    
    // Send a test email
    const result = await sendTestEmail(token);
    
    console.log("Test email sent successfully:", result);
    
    // Return the result
    return new Response(JSON.stringify({
      success: true,
      message: "Gmail API test completed successfully",
      tokenInfo,
      emailResult: result
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error testing Gmail API:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      name: error.name,
      fullError: JSON.stringify(error)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
