
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planId, userId, fullName, email, operationType, successRedirectUrl, errorRedirectUrl } = await req.json();
    
    // Validate required parameters
    if (!planId || !userId) {
      throw new Error('Missing required parameters: planId and userId are required');
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get Cardcom credentials from environment variables
    const terminalNumber = Deno.env.get('CARDCOM_TERMINAL');
    const username = Deno.env.get('CARDCOM_USERNAME');
    const apiPassword = Deno.env.get('CARDCOM_API_PASSWORD');
    
    if (!terminalNumber || !username || !apiPassword) {
      throw new Error('Missing Cardcom API credentials');
    }
    
    // Determine amount based on plan
    let amount = "0.00";
    let description = "";
    
    switch(planId) {
      case 'monthly':
        amount = "99.00";
        description = "מנוי חודשי Lovable";
        break;
      case 'annual':
        amount = "899.00";
        description = "מנוי שנתי Lovable";
        break;
      case 'vip':
        amount = "3499.00";
        description = "מנוי VIP לכל החיים Lovable";
        break;
      default:
        throw new Error('Invalid plan type');
    }
    
    // Default to token-only operation (for monthly trial)
    const operation = operationType || (planId === 'monthly' ? 3 : (planId === 'annual' ? 2 : 1));
    
    // Prepare LowProfile API parameters
    const params = new URLSearchParams({
      TerminalNumber: terminalNumber,
      UserName: username,
      APIPassword: apiPassword,
      Operation: operation.toString(),
      Language: "he",
      CoinID: "2", // USD
      SumToBill: amount,
      ProductName: description,
      APILevel: "10",
      CodePage: "65001",
      ReturnValue: userId,
      SuccessRedirectUrl: successRedirectUrl || `${supabaseUrl}/subscription?step=4&success=true&plan=${planId}`,
      ErrorRedirectUrl: errorRedirectUrl || `${supabaseUrl}/subscription?step=3&error=true&plan=${planId}`,
      IndicatorUrl: `${supabaseUrl}/functions/v1/cardcom-indicator`
    });
    
    // Add customer details if available
    if (fullName) {
      params.append("InvoiceHead.CustName", fullName);
    }
    
    if (email) {
      params.append("InvoiceHead.Email", email);
      params.append("InvoiceHead.SendByEmail", "true");
    }
    
    // For monthly trial with token-only, use J2 validation
    if (operation === 3) {
      params.append("CreateTokenJValidateType", "2");
    }
    
    // Add invoice details
    params.append("InvoiceHead.Language", "he");
    params.append("InvoiceLines1.Description", description);
    params.append("InvoiceLines1.Price", amount);
    params.append("InvoiceLines1.Quantity", "1");
    
    // Make the request to Cardcom LowProfile API
    console.log("Sending request to Cardcom LowProfile API");
    const response = await fetch("https://secure.cardcom.solutions/Interface/LowProfile.aspx", {
      method: "POST",
      body: params
    });
    
    const responseText = await response.text();
    console.log("Cardcom response:", responseText);
    
    // Extract the LowProfileCode from the response
    const codeMatch = responseText.match(/LowProfileCode=(.+?)(?:"|&)/);
    if (!codeMatch) {
      throw new Error('Failed to extract LowProfileCode from Cardcom response');
    }
    
    const lowProfileCode = codeMatch[1];
    
    // Save payment attempt to database
    const { data: paymentData, error: paymentError } = await supabase
      .from('payment_history')
      .insert({
        user_id: userId,
        subscription_id: userId, // Using userId as subscription_id temporarily
        amount: parseFloat(amount),
        currency: "USD",
        status: "initiated",
        payment_method: { operation: operation, lowProfileCode: lowProfileCode },
        description: `Payment initiated for ${planId} plan`
      });
    
    if (paymentError) {
      console.error("Error recording payment attempt:", paymentError);
    }
    
    // Construct the payment page URL for embedding
    const paymentPageUrl = `https://secure.cardcom.solutions/Pages/LowProfile.aspx?TerminalNumber=${terminalNumber}&LowProfileCode=${lowProfileCode}`;
    
    return new Response(
      JSON.stringify({ url: paymentPageUrl, lowProfileCode: lowProfileCode }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error("Error processing Cardcom request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
