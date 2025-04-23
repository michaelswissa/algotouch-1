import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[CARDCOM-WEBHOOK] ${step}${detailsStr}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    logStep("Webhook payload received", payload)

    if (!payload || !payload.LowProfileId) {
      throw new Error("Invalid webhook payload")
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch the payment session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .select('*')
      .eq('low_profile_code', payload.LowProfileId)
      .maybeSingle()

    if (sessionError) {
      throw new Error(`Error fetching session: ${sessionError.message}`)
    }

    if (!session) {
      logStep("Session not found", { lowProfileId: payload.LowProfileId })
      return new Response(
        JSON.stringify({ success: false, message: "Session not found" }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let updateData: any = {
      status: payload.success ? 'completed' : 'failed',
      updated_at: new Date().toISOString(),
      transaction_data: payload
    }

    // For successful transactions, store additional data
    if (payload.success) {
      updateData.transaction_id = payload.TransactionId || payload.TokenInfo?.Token
      
      // Store payment method info if token was created
      if (payload.TokenInfo) {
        const paymentMethod = {
          type: 'card',
          token: payload.TokenInfo.Token,
          expMonth: payload.TokenInfo.CardMonth,
          expYear: payload.TokenInfo.CardYear,
          last4: payload.TranzactionInfo?.Last4CardDigits?.toString()?.padStart(4, '0'),
          cardType: payload.TranzactionInfo?.CardName
        }
        updateData.payment_method = paymentMethod
      }

      // Create payment log
      await supabaseAdmin
        .from('payment_logs')
        .insert({
          user_id: session.user_id,
          plan_id: session.plan_id,
          amount: session.amount,
          currency: session.currency,
          payment_status: 'success',
          transaction_id: updateData.transaction_id,
          payment_data: payload
        })
        .then(({ error }) => {
          if (error) logStep("Error creating payment log", { error })
        })

      // For token-only operations, store the token as a recurring payment method
      if (session.operation_type === 'token_only' && payload.TokenInfo?.Token) {
        await supabaseAdmin
          .from('recurring_payments')
          .insert({
            user_id: session.user_id,
            token: payload.TokenInfo.Token,
            token_expiry: new Date(payload.TokenInfo.TokenExDate),
            last_4_digits: payload.TranzactionInfo?.Last4CardDigits?.toString()
          })
          .then(({ error }) => {
            if (error) logStep("Error storing recurring payment", { error })
          })
      }

      // Update subscription if user exists
      if (session.user_id) {
        const updates = {
          user_id: session.user_id,
          plan_type: session.plan_id,
          status: session.plan_id === 'monthly' ? 'trial' : 'active',
          payment_method: updateData.payment_method
        }

        if (session.initial_next_charge_date) {
          updates.next_charge_date = session.initial_next_charge_date
        }

        await supabaseAdmin
          .from('subscriptions')
          .upsert(updates)
          .then(({ error }) => {
            if (error) logStep("Error updating subscription", { error })
          })
      }
    } else {
      // Log failed payment
      await supabaseAdmin
        .from('payment_errors')
        .insert({
          user_id: session.user_id,
          error_code: payload.ResponseCode?.toString(),
          error_message: payload.Description,
          request_data: session,
          response_data: payload
        })
        .then(({ error }) => {
          if (error) logStep("Error logging payment error", { error })
        })
    }

    // Update the payment session
    await supabaseAdmin
      .from('payment_sessions')
      .update(updateData)
      .eq('low_profile_code', payload.LowProfileId)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Webhook processed successfully" 
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logStep("Error processing webhook", { error: errorMessage })
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Error processing webhook",
        error: errorMessage
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
