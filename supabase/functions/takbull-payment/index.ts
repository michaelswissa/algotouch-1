
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  customer: {
    fullName: string;
    email: string;
    phone: string;
    address?: {
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
  };
  order: {
    reference: string;
    planType: string;
    amount: number;
    currency: string;
  };
  cardToken?: string;
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

    if (!API_KEY || !API_SECRET) {
      throw new Error("Missing Takbull API credentials");
    }

    const TAKBULL_API_URL = "https://api.takbull.co.il/api/ExtranalAPI/GetTakbullPaymentPageRedirectUrl";
    
    // Parse the request body
    const { customer, order, cardToken } = await req.json() as PaymentRequest;
    
    // Determine the deal type
    // 1=Regular, 2=Payments, 4=Recurring (Subscription), 6=Token
    const dealType = cardToken ? 6 : (order.planType === "monthly" ? 4 : 1);
    
    // Build the request payload
    const payload = {
      order_reference: order.reference,
      OrderTotalSum: order.amount,
      Currency: order.currency || "ILS",
      DisplayType: "Iframe",
      IPNAddress: "https://ndhakvhrrkczgylcmyoc.supabase.co/functions/v1/takbull-webhook",
      RedirectAddress: "https://ndhakvhrrkczgylcmyoc.supabase.co/functions/v1/takbull-success",
      CancelReturnAddress: "https://ndhakvhrrkczgylcmyoc.supabase.co/functions/v1/takbull-cancel",
      PostProcessMethod: 1,
      Language: "he",
      CustomerFullName: customer.fullName,
      CustomerPhoneNumber: customer.phone,
      CustomerEmail: customer.email,
      DealType: dealType,
      RecuringInterval: order.planType === "monthly" ? 3 : 4, // 3=Monthly, 4=Annual
      CreateDocument: true,
      DocumentType: 320, // Invoice receipt
    };
    
    // Only add card token if it's provided
    if (cardToken) {
      payload.CreditCard = {
        CardExternalToken: cardToken
      };
    }
    
    // Add address info if provided
    if (customer.address) {
      payload.ShippingAddress1 = customer.address.street;
      payload.ShippingCity = customer.address.city;
      payload.ShippingZipCode = customer.address.postalCode;
      payload.ShippingCountry = customer.address.country;
    }
    
    console.log("Sending payment request to Takbull:", payload);
    
    // Make the request to Takbull API
    const response = await fetch(TAKBULL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "API_Key": API_KEY,
        "API_Secret": API_SECRET,
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Takbull API error:", errorText);
      throw new Error(`Takbull API error: ${errorText}`);
    }
    
    const result = await response.json();
    console.log("Takbull API response:", result);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
