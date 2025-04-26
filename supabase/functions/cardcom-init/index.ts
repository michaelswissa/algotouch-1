
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  planId: string
  userId: string
  operation: 'CreateTokenOnly' | 'ChargeAndCreateToken' | 'ChargeOnly'
  timestamp: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { planId, userId, operation, timestamp } = await req.json() as RequestBody

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      throw new Error('Invalid plan selected')
    }

    // Create payment session
    const { data: session, error: sessionError } = await supabase
      .from('payment_sessions')
      .insert({
        user_id: userId,
        plan_id: planId,
        amount: plan.price,
        status: 'initiated',
        operation: operation,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      })
      .select()
      .single()

    if (sessionError || !session) {
      throw new Error('Failed to create payment session')
    }

    // Initialize CardCom low profile
    const terminalNumber = Deno.env.get('CARDCOM_TERMINAL_NUMBER')
    const apiName = Deno.env.get('CARDCOM_API_NAME')
    
    if (!terminalNumber || !apiName) {
      throw new Error('Missing CardCom configuration')
    }

    const cardcomUrl = 'https://secure.cardcom.solutions/Interface/LowProfile.aspx'
    const lowProfileCode = crypto.randomUUID()

    // Return initialization data
    return new Response(
      JSON.stringify({
        success: true,
        lowProfileCode,
        sessionId: session.id,
        terminalNumber,
        operation
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    )
  }
})
