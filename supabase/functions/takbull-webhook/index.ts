
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TakbullIPNRequest {
  Id: number;
  uniqId: string;
  OrderNumber: number;
  order_reference: string;
  DealType: number;
  CustomerFullName: string;
  CustomerEmail: string;
  CustomerPhone: string;
  OrderStatus: number;
  InvoiceStatusCode: number;
  InvoiceStatusDescription: string | null;
  StatusDescription: string | null;
  StatusCode: number;
  InitialRecuringPaymentStatusCode: number;
  InitialRecuringPaymentDescription: string | null;
  SubscriptionStatusCode: number;
  SubscriptionStatusDescription: string | null;
  IsSubscriptionPayment: boolean;
  TransactionId: number;
  InvoiceUniqId: string;
  CustomerIdentity: string;
  Token: string;
  Cardtype: string;
  Last4Digs: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const API_KEY = Deno.env.get("TAKBULL_API_KEY");
    const API_SECRET = Deno.env.get("TAKBULL_API_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!API_KEY || !API_SECRET) {
      throw new Error("Missing Takbull API credentials");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse the webhook payload
    const ipnData: TakbullIPNRequest = await req.json();
    console.log("Received Takbull IPN notification:", ipnData);
    
    // Validate the notification by calling the Takbull API
    const validateUrl = "https://api.takbull.co.il/api/ExtranalAPI/ValidateNotification";
    const validateResponse = await fetch(validateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API_Key": API_KEY,
        "API_Secret": API_SECRET,
      },
      body: JSON.stringify({ uniqId: ipnData.uniqId }),
    });
    
    if (!validateResponse.ok) {
      const errorText = await validateResponse.text();
      console.error("Takbull validation error:", errorText);
      throw new Error(`Takbull validation error: ${errorText}`);
    }
    
    const validationResult = await validateResponse.json();
    console.log("Takbull validation result:", validationResult);
    
    // Extract user_id from order_reference (assuming we used it as reference)
    const userId = ipnData.order_reference;
    
    // Check if this is a successful payment notification
    if (ipnData.StatusCode === 0) {
      // Payment was successful
      // Update subscription status in database
      
      // 1. Update the subscription record
      const subscriptionData = {
        status: ipnData.IsSubscriptionPayment ? "active" : "trial",
        payment_method: {
          token: ipnData.Token,
          cardType: ipnData.Cardtype,
          lastFourDigits: ipnData.Last4Digs
        },
        updated_at: new Date().toISOString()
      };
      
      // If this is a recurring payment, update the current_period_ends_at
      if (ipnData.IsSubscriptionPayment) {
        const now = new Date();
        const nextPeriod = new Date();
        
        if (ipnData.DealType === 4) { // Monthly
          nextPeriod.setMonth(now.getMonth() + 1);
        } else { // Annual
          nextPeriod.setFullYear(now.getFullYear() + 1);
        }
        
        subscriptionData.current_period_ends_at = nextPeriod.toISOString();
      }
      
      const { error: subscriptionError } = await supabase
        .from("subscriptions")
        .update(subscriptionData)
        .eq("user_id", userId);
        
      if (subscriptionError) {
        console.error("Error updating subscription:", subscriptionError);
      }
      
      // 2. Create a payment history record
      const { error: paymentError } = await supabase
        .from("payment_history")
        .insert({
          user_id: userId,
          subscription_id: userId, // Using user_id as subscription_id reference
          amount: validationResult.amount || 0,
          status: "completed",
          payment_date: new Date().toISOString(),
          payment_method: {
            token: ipnData.Token,
            cardType: ipnData.Cardtype,
            lastFourDigits: ipnData.Last4Digs,
            transactionId: ipnData.TransactionId,
            invoiceId: ipnData.InvoiceUniqId
          }
        });
        
      if (paymentError) {
        console.error("Error creating payment record:", paymentError);
      }
    } else {
      // Payment failed
      console.error("Payment failed:", ipnData.StatusDescription);
      
      // Create a record of the failed payment
      const { error: paymentError } = await supabase
        .from("payment_history")
        .insert({
          user_id: userId,
          subscription_id: userId,
          amount: validationResult.amount || 0,
          status: "failed",
          payment_date: new Date().toISOString(),
          payment_method: {
            error: ipnData.StatusDescription,
            statusCode: ipnData.StatusCode
          }
        });
        
      if (paymentError) {
        console.error("Error creating failed payment record:", paymentError);
      }
    }
    
    // Return a success response to Takbull
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error handling Takbull webhook:", error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
