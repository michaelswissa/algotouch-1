import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { lowProfileId, apiName = Deno.env.get('CARDCOM_API_NAME') } = body

    if (!lowProfileId) {
      throw new Error("Missing lowProfileId parameter")
    }

    // Check with CardCom API
    const response = await fetch("https://secure.cardcom.solutions/api/v11/LowProfile/GetLpResult", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        TerminalNumber: Deno.env.get('CARDCOM_TERMINAL_NUMBER'),
        ApiName: apiName,
        LowProfileId: lowProfileId
      }),
    })

    const cardcomResponse = await response.json()
    console.log('CardCom status response:', cardcomResponse)

    return new Response(
      JSON.stringify({
        success: true,
        data: cardcomResponse
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error checking payment status:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Error checking payment status"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
