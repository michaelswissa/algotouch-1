
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CardCom Configuration
const CARDCOM_CONFIG = {
  terminalNumber: "160138",
  apiName: "bLaocQRMSnwphQRUVG3b",
  apiPassword: "i9nr6caGbgheTdYfQbo6",
  endpoints: {
    submitPayment: "https://secure.cardcom.solutions/api/v11/LowProfile/Submit"
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lowProfileCode, terminalNumber, cardOwnerDetails, operationType } = await req.json();

    if (!lowProfileCode || !terminalNumber || !cardOwnerDetails) {
      throw new Error('Missing required parameters');
    }

    // Create payment submission request to CardCom
    const response = await fetch(CARDCOM_CONFIG.endpoints.submitPayment, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        TerminalNumber: terminalNumber,
        ApiName: CARDCOM_CONFIG.apiName,
        LowProfileCode: lowProfileCode,
        CardOwnerName: cardOwnerDetails.cardOwnerName,
        CardOwnerEmail: cardOwnerDetails.cardOwnerEmail,
        CardOwnerPhone: cardOwnerDetails.cardOwnerPhone,
        CardOwnerId: cardOwnerDetails.cardOwnerId,
        Operation: operationType === 'token_only' ? 'CreateTokenOnly' : 'ChargeOnly'
      })
    });

    const responseData = await response.json();

    if (responseData.ResponseCode !== 0) {
      throw new Error(responseData.Description || 'Payment submission failed');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment processed successfully',
        data: responseData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error processing payment:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Payment processing failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }
});
