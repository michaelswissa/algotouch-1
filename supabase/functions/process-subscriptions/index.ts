
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to charge token via Cardcom
async function chargeToken(token, expiryMonth, expiryYear, amount, description, customerName, customerEmail) {
  const terminalNumber = Deno.env.get('CARDCOM_TERMINAL');
  const username = Deno.env.get('CARDCOM_USERNAME');
  const apiPassword = Deno.env.get('CARDCOM_API_PASSWORD');
  
  if (!terminalNumber || !username || !apiPassword) {
    throw new Error('Missing Cardcom API credentials');
  }
  
  const params = new URLSearchParams({
    TerminalNumber: terminalNumber,
    UserName: username,
    APIPassword: apiPassword,
    TokenToCharge: "true",
    "TokenToCharge.Token": token,
    "TokenToCharge.CardValidityMonth": expiryMonth.padStart(2, '0'),
    "TokenToCharge.CardValidityYear": expiryYear.substring(2), // Use last 2 digits
    "TokenToCharge.SumToBill": amount.toString(),
    "TokenToCharge.CoinID": "2", // USD
    "TokenToCharge.APILevel": "10",
    "TokenToCharge.NumOfPayments": "1"
  });
  
  // Add invoice details if customer information is available
  if (customerName) {
    params.append("InvoiceHead.CustName", customerName);
  }
  
  if (customerEmail) {
    params.append("InvoiceHead.Email", customerEmail);
    params.append("InvoiceHead.SendByEmail", "true");
  }
  
  // Add invoice line
  params.append("InvoiceHead.Language", "he");
  params.append("InvoiceLines1.Description", description);
  params.append("InvoiceLines1.Price", amount.toString());
  params.append("InvoiceLines1.Quantity", "1");
  
  // Make request to Cardcom
  const response = await fetch("https://secure.cardcom.solutions/Interface/ChargeToken.aspx", {
    method: "POST",
    body: params
  });
  
  const responseText = await response.text();
  console.log("Cardcom charge response:", responseText);
  
  // Parse response
  const operationResponseMatch = responseText.match(/OperationResponse=(\d+)/);
  const dealResponseMatch = responseText.match(/DealResponse=(\d+)/);
  const invoiceNumberMatch = responseText.match(/InvoiceNumber=(\d+)/);
  
  const operationResponse = operationResponseMatch ? operationResponseMatch[1] : null;
  const dealResponse = dealResponseMatch ? dealResponseMatch[1] : null;
  const invoiceNumber = invoiceNumberMatch ? invoiceNumberMatch[1] : null;
  
  const success = operationResponse === "0" && dealResponse === "0";
  
  return {
    success,
    operationResponse,
    dealResponse,
    invoiceNumber,
    rawResponse: responseText
  };
}

// Helper function to send email
async function sendEmail(recipientEmail, subject, body) {
  const smtpHost = Deno.env.get('SMTP_HOST');
  const smtpPort = Deno.env.get('SMTP_PORT');
  const smtpUser = Deno.env.get('SMTP_USER');
  const smtpPass = Deno.env.get('SMTP_PASS');
  
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.error("Missing SMTP configuration");
    return false;
  }
  
  try {
    // Import nodemailer dynamically
    const nodemailer = await import("npm:nodemailer@6.9.3");
    
    // Create transporter
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    
    // Send email
    await transporter.sendMail({
      from: `"Lovable" <${smtpUser}>`,
      to: recipientEmail,
      subject: subject,
      html: body,
    });
    
    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Validate request
    const { action, secret } = await req.json();
    
    if (secret !== "subscription_processor_secret") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }
    
    if (action !== "process_subscriptions") {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const now = new Date().toISOString();
    
    // Process three types of subscriptions:
    // 1. Trials ending today - charge for monthly subscription
    // 2. Monthly subscriptions due for renewal
    // 3. Annual subscriptions due for renewal
    
    // Get all subscriptions with trial_ends_at or current_period_ends_at today or earlier
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select(`
        id, user_id, plan_type, status, trial_ends_at, current_period_ends_at, 
        payment_token_id, payment_tokens(token, token_expiry, card_last_four)
      `)
      .or(`trial_ends_at.lte.${now},current_period_ends_at.lte.${now}`)
      .in('status', ['trial', 'active'])
      .is('cancelled_at', null)
      .not('payment_token_id', 'is', null);
      
    if (subscriptionError) {
      console.error("Error fetching subscriptions:", subscriptionError);
      throw subscriptionError;
    }
    
    console.log(`Found ${subscriptions.length} subscriptions to process`);
    
    const results = {
      successful: 0,
      failed: 0,
      details: []
    };
    
    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        console.log(`Processing subscription ${subscription.id} for user ${subscription.user_id}`);
        
        // Get user information
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', subscription.user_id)
          .single();
          
        if (userError) {
          console.error(`Error fetching user ${subscription.user_id}:`, userError);
        }
        
        // Get user email
        const { data: authData } = await supabase
          .auth.admin.getUserById(subscription.user_id);
        
        const userEmail = authData?.user?.email;
        const userName = userData ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() : '';
        
        // Skip if no payment token
        if (!subscription.payment_tokens?.token) {
          console.error(`No payment token for subscription ${subscription.id}`);
          results.failed++;
          results.details.push({
            subscription_id: subscription.id,
            user_id: subscription.user_id,
            success: false,
            error: "No payment token available"
          });
          continue;
        }
        
        // Determine amount and description based on plan type
        let amount = 99;
        let description = "מנוי חודשי Lovable";
        
        if (subscription.plan_type === 'annual') {
          amount = 899;
          description = "חידוש מנוי שנתי Lovable";
        }
        
        // Extract token details
        const token = subscription.payment_tokens.token;
        const expiryDate = new Date(subscription.payment_tokens.token_expiry);
        const expiryMonth = (expiryDate.getMonth() + 1).toString();
        const expiryYear = expiryDate.getFullYear().toString();
        
        // Charge the token
        const chargeResult = await chargeToken(
          token,
          expiryMonth,
          expiryYear,
          amount,
          description,
          userName,
          userEmail
        );
        
        if (!chargeResult.success) {
          console.error(`Failed to charge token for subscription ${subscription.id}:`, chargeResult);
          
          // Update subscription to past_due
          await supabase
            .from('subscriptions')
            .update({ 
              status: 'past_due'
            })
            .eq('id', subscription.id);
          
          // Record failed payment
          await supabase
            .from('payment_history')
            .insert({
              user_id: subscription.user_id,
              subscription_id: subscription.id,
              amount: amount,
              currency: "USD",
              status: 'failed',
              error_message: `Operation response: ${chargeResult.operationResponse}, Deal response: ${chargeResult.dealResponse}`,
              description: `Failed automatic renewal for ${subscription.plan_type} plan`
            });
          
          // Send email notification about failed payment
          if (userEmail) {
            await sendEmail(
              userEmail,
              "כשלון בחידוש המנוי - Lovable",
              `<div dir="rtl">
                <h2>שלום ${userName || 'לקוח יקר'},</h2>
                <p>לצערנו, החיוב האוטומטי עבור חידוש המנוי שלך ל-Lovable לא הצליח.</p>
                <p>אנא עדכן את פרטי התשלום שלך באתר כדי להמשיך ליהנות מהשירות ללא הפרעה.</p>
                <p>בברכה,<br>צוות Lovable</p>
              </div>`
            );
          }
          
          results.failed++;
          results.details.push({
            subscription_id: subscription.id,
            user_id: subscription.user_id,
            success: false,
            error: `Charge failed: ${chargeResult.operationResponse}-${chargeResult.dealResponse}`
          });
          continue;
        }
        
        // Payment successful, update subscription
        const newPeriodEnd = new Date();
        if (subscription.plan_type === 'annual') {
          newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
        } else {
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
        }
        
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'active',
            trial_ends_at: null,
            current_period_ends_at: newPeriodEnd.toISOString(),
            next_charge_date: newPeriodEnd.toISOString()
          })
          .eq('id', subscription.id);
        
        // Record successful payment
        await supabase
          .from('payment_history')
          .insert({
            user_id: subscription.user_id,
            subscription_id: subscription.id,
            amount: amount,
            currency: "USD",
            status: 'completed',
            invoice_number: chargeResult.invoiceNumber,
            payment_method: {
              token: "***",
              card_last_four: subscription.payment_tokens.card_last_four
            },
            description: `Automatic renewal for ${subscription.plan_type} plan`
          });
        
        // Send email notification about successful payment
        if (userEmail) {
          await sendEmail(
            userEmail,
            "חידוש מנוי - Lovable",
            `<div dir="rtl">
              <h2>שלום ${userName || 'לקוח יקר'},</h2>
              <p>המנוי שלך ל-Lovable חודש בהצלחה.</p>
              <p>פרטי העסקה:</p>
              <ul>
                <li>סוג מנוי: ${subscription.plan_type === 'annual' ? 'שנתי' : 'חודשי'}</li>
                <li>סכום: $${amount}</li>
                <li>מספר חשבונית: ${chargeResult.invoiceNumber}</li>
                <li>תוקף עד: ${newPeriodEnd.toLocaleDateString('he-IL')}</li>
              </ul>
              <p>תודה שבחרת Lovable!</p>
              <p>בברכה,<br>צוות Lovable</p>
            </div>`
          );
        }
        
        results.successful++;
        results.details.push({
          subscription_id: subscription.id,
          user_id: subscription.user_id,
          success: true,
          invoice_number: chargeResult.invoiceNumber
        });
      } catch (subscriptionError) {
        console.error(`Error processing subscription ${subscription.id}:`, subscriptionError);
        results.failed++;
        results.details.push({
          subscription_id: subscription.id,
          user_id: subscription.user_id,
          success: false,
          error: subscriptionError.message
        });
      }
    }
    
    return new Response(
      JSON.stringify({
        message: `Processed ${subscriptions.length} subscriptions: ${results.successful} successful, ${results.failed} failed`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error("Error processing subscriptions:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
