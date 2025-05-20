
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { v4 as uuidv4 } from "https://deno.land/std@0.168.0/uuid/mod.ts";

interface CreateLowProfileRequest {
  terminalNumber: number;
  apiName: string;
  amount: number;
  successUrl: string;
  failedUrl: string;
  webhookUrl: string;
  productName?: string;
  language?: string;
  returnValue?: string;
  operation?: string; // Add operation parameter
  registrationData?: any; // Optional registration data
}

serve(async (req) => {
  // Handle CORS if needed
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const requestData = await req.json();
    
    // Validate required fields
    if (!requestData.amount || 
        !requestData.origin || 
        !requestData.webHookUrl) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          details: "amount, origin, and webHookUrl are required"
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        }
      );
    }

    // Get terminal number and API name from environment variables
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "160138";
    const apiName = Deno.env.get("CARDCOM_API_NAME") || "terminal160138";
    
    // Create a valid registration ID (must be a UUID)
    const registrationId = uuidv4();

    // Build URL for success/failure redirects
    const baseUrl = requestData.origin || "https://your-app-url.com";
    const successUrl = `${baseUrl}/payment/success?plan=${requestData.planId || "unknown"}`;
    const failedUrl = `${baseUrl}/payment/error?plan=${requestData.planId || "unknown"}`;
    
    console.log('Creating CardCom payment session with terminal:', terminalNumber, 'operation:', requestData.operationType || "ChargeAndCreateToken", 'amount:', requestData.amount);

    // Save registration data if provided
    if (requestData.registrationData) {
      try {
        // Store the registration ID and data
        const { data, error } = await fetch("https://ndhakvhrrkczgylcmyoc.supabase.co/functions/v1/cardcom-payment/save-registration-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          },
          body: JSON.stringify({
            registrationId,
            registrationData: requestData.registrationData
          })
        }).then(res => res.json());

        if (error) {
          console.error("Error saving registration data:", error);
        } else {
          console.log("Created CardCom payment session:", registrationId);
        }
      } catch (error) {
        console.error("Error saving payment session:", error);
      }
    }

    // Prepare user details for payment form
    const userDetails = requestData.userDetails || {};
    console.log('Sending payload with user details:', {
      name: userDetails.fullName || "",
      email: userDetails.email || "",
      phone: userDetails.phone || "",
      idNumber: userDetails.idNumber || "",
      operation: requestData.operationType || "ChargeAndCreateToken",
      amount: requestData.amount,
      webhookUrl: requestData.webHookUrl
    });

    // Build request body for Cardcom API
    const cardcomRequestBody = {
      TerminalNumber: parseInt(terminalNumber),
      ApiName: apiName,
      // Include the operation (e.g. ChargeAndCreateToken) for recurring payments
      Operation: requestData.operationType || "ChargeAndCreateToken",
      Amount: requestData.amount,
      SuccessRedirectUrl: successUrl,
      FailedRedirectUrl: failedUrl,
      WebHookUrl: requestData.webHookUrl,
      ProductName: requestData.productName || "AlgoTouch Subscription",
      Language: requestData.language || "he",
      ReturnValue: registrationId || "",
      UIDefinition: {
        IsHideCardOwnerName: !userDetails.fullName,
        CardOwnerNameValue: userDetails.fullName || "",
        IsHideCardOwnerPhone: !userDetails.phone,
        CardOwnerPhoneValue: userDetails.phone || "",
        IsCardOwnerPhoneRequired: true,
        IsHideCardOwnerEmail: !userDetails.email,
        CardOwnerEmailValue: userDetails.email || "",
        IsCardOwnerEmailRequired: true
      }
    };

    // Call Cardcom API to create low profile page (updated to v11)
    const response = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/Create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(cardcomRequestBody)
    });

    // Parse the response
    const data = await response.json();
    
    console.log("Received response from Cardcom:", JSON.stringify(data));
    
    // Add the registration ID to the response
    data.registrationId = registrationId;
    
    // Return the response
    return new Response(
      JSON.stringify(data),
      {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    // Handle errors
    console.error("Error in iframe-redirect function:", error);
    
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});
