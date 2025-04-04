
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  // Parse URL parameters (Cardcom sends this as GET request)
  const url = new URL(req.url);
  const params = url.searchParams;
  
  // Extract important values from query params
  const userId = params.get("ReturnValue"); 
  const operation = params.get("Operation");
  const operationResponse = params.get("OperationResponse");
  const dealResponse = params.get("DealResponse");
  const tokenResponse = params.get("TokenResponse");
  const token = params.get("Token");
  const tokenExp = params.get("TokenExDate");
  const internalDealNumber = params.get("InternalDealNumber");
  const invoiceNumber = params.get("InvoiceNumber");
  const lowProfileCode = params.get("LowProfileCode");
  
  // Basic logging
  console.log("Cardcom indicator call received", {
    userId,
    operation,
    operationResponse,
    dealResponse,
    tokenResponse,
    token: token ? "***" : null,
    tokenExp,
    invoiceNumber
  });
  
  // Create Supabase admin client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Find the user information
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error("Error fetching user info:", userError);
    }
    
    // Get user email
    const { data: authData } = await supabase
      .auth.admin.getUserById(userId);
    
    const userEmail = authData?.user?.email;
    const userName = userData ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() : '';
    
    // Get the payment history entry
    const { data: paymentHistory, error: paymentError } = await supabase
      .from('payment_history')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'initiated')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (paymentError) {
      console.error("Error fetching payment history:", paymentError);
    }
    
    const paymentRecord = paymentHistory && paymentHistory.length > 0 ? paymentHistory[0] : null;
    
    // Check if transaction succeeded
    const success = operationResponse === "0" && 
                    (dealResponse === "0" || dealResponse === undefined || dealResponse === null) &&
                    (tokenResponse === "0" || operation === "1");
    
    if (!success) {
      // Payment failed
      console.log("Payment failed", { operationResponse, dealResponse, tokenResponse });
      
      // Update payment history
      if (paymentRecord) {
        await supabase
          .from('payment_history')
          .update({ 
            status: 'failed',
            error_message: `Operation response: ${operationResponse}, Deal response: ${dealResponse}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentRecord.id);
      }
      
      // Try to send email notification about failed payment
      if (userEmail) {
        await sendEmail(
          userEmail,
          "כשלון בתשלום - Lovable",
          `<div dir="rtl">
            <h2>שלום ${userName || 'לקוח יקר'},</h2>
            <p>לצערנו, התשלום עבור המנוי ל-Lovable לא הצליח.</p>
            <p>אנא בדוק את פרטי כרטיס האשראי שלך ונסה שנית, או צור קשר עם התמיכה שלנו.</p>
            <p>בברכה,<br>צוות Lovable</p>
          </div>`
        );
      }
      
      return new Response("OK", { status: 200 });
    }
    
    // Payment succeeded
    console.log("Payment succeeded", { token: token ? "exists" : "none", operation });
    
    // Process based on operation type
    let planType, status, trialEndsAt = null, currentPeriodEndsAt = null;
    
    // Figure out plan type from the payment amount
    if (paymentRecord) {
      if (paymentRecord.amount === 99) planType = 'monthly';
      else if (paymentRecord.amount === 899) planType = 'annual';
      else if (paymentRecord.amount === 3499) planType = 'vip';
    }
    
    const now = new Date();
    
    if (operation === "3") {
      // Monthly trial (token only)
      status = 'trial';
      const trialEnd = new Date(now);
      trialEnd.setMonth(trialEnd.getMonth() + 1);
      trialEndsAt = trialEnd.toISOString();
    } else if (operation === "2" || operation === "1") {
      // Paid plan (charge or charge + token)
      status = 'active';
      if (planType === 'annual') {
        const periodEnd = new Date(now);
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        currentPeriodEndsAt = periodEnd.toISOString();
      } else if (planType === 'monthly') {
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        currentPeriodEndsAt = periodEnd.toISOString();
      }
    }
    
    // Save token if provided
    let paymentTokenId = null;
    if (token) {
      // Format token expiry from YYYYMMDD to ISO date
      let formattedExpiry = tokenExp;
      if (tokenExp && tokenExp.length === 8) {
        const year = tokenExp.substring(0, 4);
        const month = tokenExp.substring(4, 6);
        const day = tokenExp.substring(6, 8);
        formattedExpiry = `${year}-${month}-${day}`;
      }
      
      // Get last 4 digits if available
      let lastFourDigits = null;
      if (params.get("CardNumber")) {
        const cardNumber = params.get("CardNumber");
        lastFourDigits = cardNumber.slice(-4);
      }
      
      // Save token
      const { data: tokenData, error: tokenError } = await supabase
        .from('payment_tokens')
        .insert({
          user_id: userId,
          token: token,
          token_expiry: formattedExpiry,
          card_last_four: lastFourDigits,
          card_brand: params.get("CardType") || null
        })
        .select('id')
        .single();
        
      if (tokenError) {
        console.error("Error saving payment token:", tokenError);
      } else {
        paymentTokenId = tokenData.id;
      }
    }
    
    // Update subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan_type: planType || 'monthly',
        status: status || 'active',
        trial_ends_at: trialEndsAt,
        current_period_ends_at: currentPeriodEndsAt,
        payment_method: {
          last_four: params.get("CardNumber") ? params.get("CardNumber").slice(-4) : null,
          expiry_month: tokenExp ? tokenExp.substring(4, 6) : null,
          expiry_year: tokenExp ? tokenExp.substring(0, 4) : null
        },
        payment_token_id: paymentTokenId,
        next_charge_date: trialEndsAt || currentPeriodEndsAt
      })
      .select('id')
      .single();
      
    if (subscriptionError) {
      console.error("Error updating subscription:", subscriptionError);
    }
    
    // Update payment history
    if (paymentRecord) {
      await supabase
        .from('payment_history')
        .update({ 
          status: 'completed',
          invoice_number: invoiceNumber,
          cardcom_deal_id: internalDealNumber,
          payment_method: {
            token: token ? "***" : null,
            card_last_four: params.get("CardNumber") ? params.get("CardNumber").slice(-4) : null,
            expiry: tokenExp
          },
          subscription_id: subscription?.id || userId
        })
        .eq('id', paymentRecord.id);
    } else {
      // Create new payment record if one doesn't exist
      await supabase
        .from('payment_history')
        .insert({
          user_id: userId,
          subscription_id: subscription?.id || userId,
          amount: operation === "3" ? 0 : (planType === 'monthly' ? 99 : (planType === 'annual' ? 899 : 3499)),
          currency: "USD",
          status: 'completed',
          invoice_number: invoiceNumber,
          cardcom_deal_id: internalDealNumber,
          payment_method: {
            token: token ? "***" : null,
            card_last_four: params.get("CardNumber") ? params.get("CardNumber").slice(-4) : null,
            expiry: tokenExp
          },
          description: `Payment completed for ${planType || 'subscription'}`
        });
    }
    
    // Send email notification about successful payment
    if (userEmail) {
      const emailSubject = operation === "3" ? 
        "ברוך הבא לתקופת הניסיון - Lovable" : 
        "תשלום התקבל בהצלחה - Lovable";
        
      const emailBody = operation === "3" ? 
        `<div dir="rtl">
          <h2>שלום ${userName || 'לקוח יקר'},</h2>
          <p>ברוך הבא לתקופת הניסיון החינמית של Lovable!</p>
          <p>פרטי התשלום שלך נשמרו בהצלחה, ותקופת הניסיון שלך תסתיים ב-${new Date(trialEndsAt).toLocaleDateString('he-IL')}.</p>
          <p>לאחר מכן, תחויב אוטומטית בסכום של $99 לחודש, אלא אם תבטל את המנוי לפני תום תקופת הניסיון.</p>
          <p>בברכה,<br>צוות Lovable</p>
        </div>` :
        `<div dir="rtl">
          <h2>שלום ${userName || 'לקוח יקר'},</h2>
          <p>תודה על רכישת מנוי ל-Lovable!</p>
          <p>התשלום התקבל בהצלחה ומספר החשבונית שלך הוא: ${invoiceNumber}.</p>
          ${currentPeriodEndsAt ? `<p>המנוי שלך בתוקף עד ${new Date(currentPeriodEndsAt).toLocaleDateString('he-IL')}.</p>` : ''}
          <p>בברכה,<br>צוות Lovable</p>
        </div>`;
        
      await sendEmail(userEmail, emailSubject, emailBody);
    }
    
    // Return OK to Cardcom
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Error processing Cardcom indicator:", error);
    // Still return 200 to avoid Cardcom retrying
    return new Response("ERROR: " + error.message, { status: 200 });
  }
});
