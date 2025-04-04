
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface CardcomPaymentRequest {
  planId: string;
  userId: string;
  fullName: string;
  email: string;
  operationType: number; // 1, 2, or 3
  successRedirectUrl: string;
  errorRedirectUrl: string;
}

interface CardcomChargeTokenRequest {
  token: string;
  validityMonth: string;
  validityYear: string;
  sumToBill: number;
  coinId: number;
  userId: string;
  planId: string;
  fullName: string;
  email: string;
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
    console.log("--- CARDCOM PAYMENT FUNCTION CALLED ---");
    
    // Get Cardcom API configuration from environment variables
    const terminalNumber = Deno.env.get("CARDCOM_TERMINAL_NUMBER");
    const userName = Deno.env.get("CARDCOM_API_USERNAME");
    const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD");
    const indicatorUrl = Deno.env.get("CARDCOM_INDICATOR_URL");
    
    // Log configuration (without sensitive details)
    console.log("Cardcom Configuration:");
    console.log(`Terminal Number: ${terminalNumber ? "Provided" : "MISSING"}`);
    console.log(`API Username: ${userName ? "Provided" : "MISSING"}`);
    console.log(`API Password: ${apiPassword ? "Provided" : "MISSING"}`);
    console.log(`Indicator URL: ${indicatorUrl}`);
    
    // Check if Cardcom is properly configured
    if (!terminalNumber || !userName || !apiPassword) {
      const missing = [];
      if (!terminalNumber) missing.push("CARDCOM_TERMINAL_NUMBER");
      if (!userName) missing.push("CARDCOM_API_USERNAME");
      if (!apiPassword) missing.push("CARDCOM_API_PASSWORD");
      
      const errorMessage = `Cardcom not configured properly. Missing: ${missing.join(", ")}`;
      console.error(errorMessage);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          details: {
            terminalNumber: terminalNumber ? "✓" : "✗",
            userName: userName ? "✓" : "✗",
            apiPassword: apiPassword ? "✓" : "✗",
            indicatorUrl: indicatorUrl ? "✓" : "✗"
          }
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different endpoints
    if (path === "create-payment") {
      return await handleCreatePayment(req, terminalNumber, userName, apiPassword, indicatorUrl, corsHeaders, supabase);
    } else if (path === "charge-token") {
      return await handleChargeToken(req, terminalNumber, userName, apiPassword, corsHeaders, supabase);
    } else if (path === "webhook") {
      return await handleWebhook(req, corsHeaders, supabase);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid endpoint" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }
  } catch (error) {
    console.error("Unhandled error in Cardcom payment function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Unhandled error in Cardcom payment function",
        details: {
          message: error.message,
          name: error.name,
          stack: error.stack
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Create initial payment session
async function handleCreatePayment(
  req: Request, 
  terminalNumber: string,
  userName: string,
  apiPassword: string,
  indicatorUrl: string,
  corsHeaders: Record<string, string>,
  supabase: any
) {
  try {
    const { planId, userId, fullName, email, operationType, successRedirectUrl, errorRedirectUrl }: CardcomPaymentRequest = await req.json();
    
    // Validate required parameters
    if (!planId || !userId || !email || !operationType) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameters",
          details: {
            hasPlanId: Boolean(planId),
            hasUserId: Boolean(userId),
            hasEmail: Boolean(email),
            hasOperationType: Boolean(operationType)
          }
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Determine plan details from planId
    const planDetails = getPlanDetails(planId);
    if (!planDetails) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid plan ID"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log(`Creating payment session for plan ${planId}, operation type: ${operationType}`);
    
    // Create form data for Cardcom request
    const formData = new URLSearchParams();
    formData.append("TerminalNumber", terminalNumber);
    formData.append("UserName", userName);
    formData.append("APIPassword", apiPassword);
    formData.append("Operation", operationType.toString());
    formData.append("SumToBill", planDetails.price.toString());
    formData.append("CoinID", "2"); // USD
    formData.append("Language", "he");
    formData.append("ProductName", `LOVABLE ${planDetails.name} Plan`);
    formData.append("APILevel", "10");
    formData.append("ReturnValue", `${userId}:${planId}`); // Store both IDs for reference
    
    // URLs for redirects and webhook
    formData.append("SuccessRedirectUrl", successRedirectUrl);
    formData.append("ErrorRedirectUrl", errorRedirectUrl);
    formData.append("IndicatorUrl", indicatorUrl || `${new URL(req.url).origin}/functions/cardcom-payment/webhook`);
    
    // Collect customer info
    formData.append("ReqCardOwnerEmail", "true");
    formData.append("ShowInvoiceHead", "true");
    formData.append("InvoiceHeadOperation", "1");
    
    // Pre-fill invoice data if available
    if (email) {
      formData.append("InvoiceHead.Email", email);
    }
    if (fullName) {
      formData.append("InvoiceHead.CustName", fullName);
    }
    
    // Request invoice generation
    formData.append("DocType", "1"); // Invoice/Receipt
    
    // Make API request to Cardcom
    console.log("Sending request to Cardcom LowProfile API");
    const cardcomResponse = await fetch("https://secure.cardcom.solutions/Interface/LowProfile.aspx", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    
    // Parse response
    const responseText = await cardcomResponse.text();
    console.log("Cardcom response:", responseText);
    
    // Cardcom responds with name=value pairs, parse them
    const responseParams = Object.fromEntries(
      responseText.split("&").map((pair) => {
        const [key, value] = pair.split("=");
        return [key, decodeURIComponent(value || "")];
      })
    );
    
    // Check if operation was successful
    if (responseParams.ResponseCode !== "0") {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cardcom error: ${responseParams.ErrorText || "Unknown error"}`,
          responseParams
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
    // Store temporary transaction data
    await supabase
      .from("payment_transactions")
      .insert({
        user_id: userId,
        plan_id: planId,
        operation_type: operationType,
        low_profile_code: responseParams.LowProfileCode,
        amount: planDetails.price,
        currency: "USD",
        status: "pending",
        transaction_data: responseParams
      });
    
    return new Response(
      JSON.stringify({
        success: true,
        lowProfileCode: responseParams.LowProfileCode,
        url: responseParams.url || `https://secure.cardcom.solutions/external/LowProfile.aspx?LowProfileCode=${responseParams.LowProfileCode}`,
        responseParams
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating payment session:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to create payment session",
        details: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}

// Handle token charges for recurring payments
async function handleChargeToken(
  req: Request, 
  terminalNumber: string,
  userName: string,
  apiPassword: string,
  corsHeaders: Record<string, string>,
  supabase: any
) {
  try {
    const {
      token,
      validityMonth,
      validityYear,
      sumToBill,
      coinId = 2,
      userId,
      planId,
      fullName,
      email
    }: CardcomChargeTokenRequest = await req.json();
    
    // Validate required parameters
    if (!token || !validityMonth || !validityYear || !sumToBill || !userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required parameters for token charge",
          details: {
            hasToken: Boolean(token),
            hasValidityMonth: Boolean(validityMonth),
            hasValidityYear: Boolean(validityYear),
            hasSumToBill: Boolean(sumToBill),
            hasUserId: Boolean(userId)
          }
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log(`Charging token for user ${userId}, plan ${planId}, amount ${sumToBill}`);
    
    // Create form data for Cardcom token charge request
    const formData = new URLSearchParams();
    formData.append("TerminalNumber", terminalNumber);
    formData.append("UserName", userName);
    formData.append("APIPassword", apiPassword);
    formData.append("TokenToCharge.Token", token);
    formData.append("TokenToCharge.CardValidityMonth", validityMonth);
    formData.append("TokenToCharge.CardValidityYear", validityYear);
    formData.append("TokenToCharge.SumToBill", sumToBill.toString());
    formData.append("TokenToCharge.CoinID", coinId.toString());
    formData.append("TokenToCharge.APILevel", "10");
    formData.append("TokenToCharge.NumOfPayments", "1");
    formData.append("TokenToCharge.DocTypeToCreate", "1"); // Invoice/Receipt
    formData.append("ReturnValue", `${userId}:${planId}`); // Store both IDs for reference
    
    // Make API request to Cardcom
    console.log("Sending request to Cardcom ChargeToken API");
    const cardcomResponse = await fetch("https://secure.cardcom.solutions/Interface/ChargeToken.aspx", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    
    // Parse response
    const responseText = await cardcomResponse.text();
    console.log("Cardcom charge token response:", responseText);
    
    // Cardcom responds with name=value pairs, parse them
    const responseParams = Object.fromEntries(
      responseText.split("&").map((pair) => {
        const [key, value] = pair.split("=");
        return [key, decodeURIComponent(value || "")];
      })
    );
    
    // Check if operation was successful
    if (responseParams.ResponseCode !== "0") {
      // Log failed payment attempt
      await supabase
        .from("payment_history")
        .insert({
          user_id: userId,
          subscription_id: userId,
          amount: sumToBill,
          currency: "USD",
          status: "failed",
          payment_date: new Date().toISOString(),
          payment_method: { 
            token_last_digits: token.substring(token.length - 4),
            token_expiry: `${validityMonth}/${validityYear}`
          }
        });
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cardcom charge error: ${responseParams.ErrorText || "Unknown error"}`,
          responseParams
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }
    
    // Store successful payment
    await supabase
      .from("payment_history")
      .insert({
        user_id: userId,
        subscription_id: userId,
        amount: sumToBill,
        currency: "USD",
        status: "completed",
        payment_date: new Date().toISOString(),
        payment_method: { 
          token_last_digits: token.substring(token.length - 4),
          token_expiry: `${validityMonth}/${validityYear}`,
          internal_deal_number: responseParams.InternalDealNumber,
          invoice_number: responseParams.InvoiceNumber
        }
      });
    
    // Update subscription based on plan type
    const planDetails = getPlanDetails(planId);
    if (planDetails) {
      let nextBillingDate;
      if (planId === "monthly") {
        nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      } else if (planId === "annual") {
        nextBillingDate = new Date();
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      }
      
      if (nextBillingDate) {
        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            current_period_ends_at: nextBillingDate.toISOString()
          })
          .eq("user_id", userId);
      }
    }
    
    // If successful, try to send a payment confirmation email
    try {
      if (email) {
        const formattedDate = new Date().toLocaleDateString('he-IL');
        const formattedSum = `$${sumToBill.toFixed(2)}`;
        const planName = planDetails?.name || planId;
        
        await supabase.functions.invoke('gmail-sender', {
          body: {
            to: email,
            subject: `אישור תשלום עבור מנוי ${planName} - AlgoTouch`,
            html: `
            <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #4a90e2;">AlgoTouch</h1>
              </div>
              <p>שלום ${fullName || ''},</p>
              <p>אנו מאשרים קבלת תשלום עבור מנוי ${planName} באתר AlgoTouch.</p>
              <p><strong>פרטי התשלום:</strong></p>
              <ul>
                <li>תאריך: ${formattedDate}</li>
                <li>סכום: ${formattedSum}</li>
                <li>מנוי: ${planName}</li>
                ${responseParams.InvoiceNumber ? `<li>מספר חשבונית: ${responseParams.InvoiceNumber}</li>` : ''}
              </ul>
              <p>המנוי שלך פעיל כעת ויש לך גישה מלאה לכל התכונות.</p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea;">
                <p>תודה על השימוש בשירותי AlgoTouch,<br/>צוות AlgoTouch</p>
              </div>
            </div>
            `,
          },
        });
      }
    } catch (emailError) {
      console.error("Error sending payment confirmation email:", emailError);
      // Continue anyway since the payment was successful
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        internalDealNumber: responseParams.InternalDealNumber,
        invoiceNumber: responseParams.InvoiceNumber,
        responseParams
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error charging token:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to charge token",
        details: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}

// Handle Cardcom webhook callbacks
async function handleWebhook(
  req: Request,
  corsHeaders: Record<string, string>,
  supabase: any
) {
  try {
    // Parse form data from the webhook request
    const formData = await req.formData();
    const params: Record<string, string> = {};
    
    // Convert FormData to a regular object
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }
    
    console.log("Received webhook from Cardcom with params:", params);
    
    // Extract user ID and plan ID from ReturnValue
    let userId, planId;
    if (params.ReturnValue) {
      [userId, planId] = params.ReturnValue.split(":");
    }
    
    if (!userId) {
      console.error("Missing user ID in webhook data");
      return new Response("Missing user ID", {
        headers: corsHeaders,
        status: 400,
      });
    }
    
    // Save the complete webhook data for logging/debugging
    await supabase
      .from("payment_webhooks")
      .insert({
        user_id: userId,
        webhook_type: "cardcom_indicator",
        webhook_data: params,
        processed_at: new Date().toISOString()
      });
    
    // Check if this is a successful token creation or payment
    const operationResponse = parseInt(params.OperationResponse || "-1");
    const dealResponse = parseInt(params.DealResponse || "-1");
    const tokenResponse = parseInt(params.TokenResponse || "-1");
    
    if (operationResponse === 0) {
      console.log("Webhook indicates successful operation");
      
      // Determine what to process based on the operation type
      const operation = parseInt(params.Operation || "0");
      
      // If we have an invoice, record it
      let invoiceNumber = null;
      if (params.InvoiceResponseCode === "0" && params.InvoiceNumber) {
        invoiceNumber = params.InvoiceNumber;
        console.log(`Invoice number ${invoiceNumber} generated`);
      }
      
      // If we have a token, store it
      let tokenData = null;
      if (tokenResponse === 0 && params.Token) {
        tokenData = {
          token: params.Token,
          tokenExDate: params.TokenExDate,
          cardLast4: params.ExtShvaParams?.CardNumber5 || params.CardNumber5 || "****"
        };
        console.log(`Token successfully created for user ${userId}`);
      }
      
      // If this was a payment (Operation 1 or 2), record the transaction
      if ((operation === 1 || operation === 2) && dealResponse === 0) {
        // Record the payment in payment_history
        await supabase
          .from("payment_history")
          .insert({
            user_id: userId,
            subscription_id: userId,
            amount: parseFloat(params.SumToBill || "0"),
            currency: params.CoinID === "2" ? "USD" : "ILS",
            status: "completed",
            payment_date: new Date().toISOString(),
            payment_method: {
              internal_deal_number: params.InternalDealNumber,
              invoice_number: invoiceNumber,
              token_last_digits: tokenData?.cardLast4 || "****"
            }
          });
        
        console.log(`Payment recorded for user ${userId}`);
      }
      
      // Update subscription based on plan type and operation
      if (planId && tokenData) {
        const planDetails = getPlanDetails(planId);
        if (planDetails) {
          let subscriptionData: any = {
            user_id: userId,
            plan_type: planId,
            payment_method: tokenData
          };
          
          // Determine trial/active status and end dates
          if (planId === "monthly") {
            if (operation === 3) {
              // Operation 3: Creating token without charge = start trial
              const trialEndsAt = new Date();
              trialEndsAt.setMonth(trialEndsAt.getMonth() + 1); // 1 month trial
              
              subscriptionData.status = "trial";
              subscriptionData.trial_ends_at = trialEndsAt.toISOString();
            } else if (operation === 1 || operation === 2) {
              // Charged - active monthly subscription
              const nextBillingDate = new Date();
              nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
              
              subscriptionData.status = "active";
              subscriptionData.current_period_ends_at = nextBillingDate.toISOString();
            }
          } else if (planId === "annual") {
            // Annual plan - immediate charge, active for a year
            const nextBillingDate = new Date();
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
            
            subscriptionData.status = "active";
            subscriptionData.current_period_ends_at = nextBillingDate.toISOString();
          } else if (planId === "vip") {
            // VIP plan - one-time payment, never expires
            subscriptionData.status = "lifetime";
          }
          
          // Check if subscription already exists
          const { data: existingSubscription } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("user_id", userId)
            .single();
          
          if (existingSubscription) {
            // Update existing subscription
            await supabase
              .from("subscriptions")
              .update(subscriptionData)
              .eq("user_id", userId);
            
            console.log(`Updated subscription for user ${userId}`);
          } else {
            // Create new subscription
            await supabase
              .from("subscriptions")
              .insert(subscriptionData);
            
            console.log(`Created new subscription for user ${userId}`);
          }
        }
      }
      
      // Try to send a confirmation email
      try {
        if (params.CardOwnerEmail && userId && planId) {
          const planDetails = getPlanDetails(planId);
          const planName = planDetails?.name || planId;
          
          await supabase.functions.invoke('gmail-sender', {
            body: {
              to: params.CardOwnerEmail,
              subject: `אישור הצטרפות למנוי ${planName} - AlgoTouch`,
              html: `
              <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <h1 style="color: #4a90e2;">AlgoTouch</h1>
                </div>
                <p>שלום ${params.CardOwnerName || ''},</p>
                <p>תודה שהצטרפת למנוי ${planName} באתר AlgoTouch.</p>
                ${operation === 3 ? `
                <p><strong>המנוי שלך נמצא בתקופת ניסיון בת 30 יום.</strong> בסיום תקופה זו, כרטיס האשראי שלך יחויב אוטומטית בסכום של $${planDetails?.price || 99} מדי חודש.</p>
                ` : `
                <p><strong>פרטי המנוי:</strong></p>
                <ul>
                  <li>סוג מנוי: ${planName}</li>
                  <li>מחיר: $${planDetails?.price || 0}</li>
                  ${invoiceNumber ? `<li>מספר חשבונית: ${invoiceNumber}</li>` : ''}
                </ul>
                `}
                <p>המנוי שלך פעיל כעת ויש לך גישה מלאה לכל התכונות.</p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea;">
                  <p>תודה על השימוש בשירותי AlgoTouch,<br/>צוות AlgoTouch</p>
                </div>
              </div>
              `,
            },
          });
          
          console.log(`Sent subscription confirmation email to ${params.CardOwnerEmail}`);
        }
      } catch (emailError) {
        console.error("Error sending subscription confirmation email:", emailError);
        // Continue anyway since the webhook processing was successful
      }
    } else {
      console.warn(`Webhook indicates failed operation: OperationResponse=${operationResponse}`);
      
      // Record the failed transaction
      if (userId) {
        await supabase
          .from("payment_history")
          .insert({
            user_id: userId,
            subscription_id: userId,
            amount: parseFloat(params.SumToBill || "0"),
            currency: params.CoinID === "2" ? "USD" : "ILS",
            status: "failed",
            payment_date: new Date().toISOString(),
            payment_method: {
              error_code: params.OperationResponse,
              error_text: params.ErrorText || "Unknown error"
            }
          });
      }
    }
    
    // Always respond with 200 OK to acknowledge receipt
    return new Response("OK", {
      headers: corsHeaders,
      status: 200,
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    
    // Still return 200 to prevent Cardcom from retrying
    return new Response("Error processed", {
      headers: corsHeaders,
      status: 200,
    });
  }
}

// Helper function to get plan details
function getPlanDetails(planId: string) {
  const plans = {
    monthly: {
      name: "חודשי",
      price: 99,
      description: "ללא התחייבות: תתחיל, תתנסה, תחליט לפי התוצאות.",
    },
    annual: {
      name: "שנתי", 
      price: 899,
      description: "25% הנחה | שלושה חודשים מתנה",
    },
    vip: {
      name: "VIP",
      price: 3499,
      description: "גישה לכל החיים בתשלום חד פעמי",
    }
  };
  
  return plans[planId as keyof typeof plans];
}
