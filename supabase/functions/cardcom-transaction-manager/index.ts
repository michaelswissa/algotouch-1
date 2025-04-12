
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CardCom API credentials
const CARDCOM_API_NAME = Deno.env.get("CARDCOM_API_NAME") || "";
const CARDCOM_API_PASSWORD = Deno.env.get("CARDCOM_API_PASSWORD") || "";
const CARDCOM_TERMINAL_NUMBER = Deno.env.get("CARDCOM_TERMINAL_NUMBER") || "";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Handle CORS preflight requests
function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }
  return null;
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { action, params } = await req.json();
    console.log(`Received request for action: ${action}`);
    
    let response;
    
    switch(action) {
      case 'listTransactions':
        response = await listTransactions(params);
        break;
      case 'getTransactionById':
        response = await getTransactionById(params);
        break;
      case 'refundTransaction':
        response = await refundTransaction(params);
        break;
      case 'cleanupPaymentSession':
        response = await cleanupPaymentSession(params);
        break;
      default:
        throw new Error('Invalid action specified');
    }
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// Function to list recent transactions
async function listTransactions({ 
  fromDate = formatDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)), // 3 days ago
  toDate = formatDate(new Date()),
  page = 1,
  pageSize = 20,
  terminalNumber = CARDCOM_TERMINAL_NUMBER
}) {
  console.log(`Listing transactions from ${fromDate} to ${toDate}, page ${page}, pageSize ${pageSize}`);
  
  const requestBody = {
    ApiName: CARDCOM_API_NAME,
    ApiPassword: CARDCOM_API_PASSWORD,
    FromDate: fromDate,
    ToDate: toDate,
    TranStatus: "Success",
    Page: page,
    Page_size: pageSize,
    LimitForTerminal: parseInt(terminalNumber, 10)
  };
  
  const response = await fetch("https://secure.cardcom.solutions/api/v11/Transactions/ListTransactions", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  const data = await response.json();
  console.log(`Got response with ${data.Tranzactions ? data.Tranzactions.length : 0} transactions`);
  
  return data;
}

// Function to get transaction by ID
async function getTransactionById({ transactionId, terminalNumber = CARDCOM_TERMINAL_NUMBER }) {
  console.log(`Getting transaction details for ID: ${transactionId}`);
  
  const requestBody = {
    TerminalNumber: parseInt(terminalNumber, 10),
    UserName: CARDCOM_API_NAME,
    UserPassword: CARDCOM_API_PASSWORD,
    InternalDealNumber: parseInt(transactionId, 10)
  };
  
  const response = await fetch("https://secure.cardcom.solutions/api/v11/Transactions/GetTransactionInfoById", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  const data = await response.json();
  return data;
}

// Function to refund a transaction
async function refundTransaction({ 
  transactionId, 
  externalDealId = null, 
  partialSum = null,
  cancelOnly = false 
}) {
  console.log(`Processing refund for transaction ID: ${transactionId}`);
  
  const requestBody = {
    ApiName: CARDCOM_API_NAME,
    ApiPassword: CARDCOM_API_PASSWORD,
    TransactionId: parseInt(transactionId, 10),
    ExternalDealId: externalDealId,
    PartialSum: partialSum ? parseFloat(partialSum) : null,
    CancelOnly: cancelOnly
  };
  
  const response = await fetch("https://secure.cardcom.solutions/api/v11/Transactions/RefundByTransactionId", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  
  const data = await response.json();
  
  // Log to the payment_errors table for tracking
  if (data.ResponseCode === 0) {
    try {
      await supabase
        .from("payment_errors")
        .insert({
          user_id: "system",
          error_code: "refund-processed",
          error_message: `Transaction ${transactionId} successfully refunded`,
          context: "manual-refund",
          payment_details: {
            transactionId: transactionId,
            refundTransactionId: data.NewTranzactionId,
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      console.error('Error logging refund to database:', error);
    }
  }
  
  return data;
}

// Function to clean up payment session data
async function cleanupPaymentSession({ lowProfileId, userId = null }) {
  console.log(`Cleaning up payment session for lowProfileId: ${lowProfileId}`);
  
  let paymentSession = null;
  
  // Find the payment session
  if (lowProfileId) {
    const { data, error } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("payment_details->lowProfileId", lowProfileId)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching payment session:', error);
    } else if (data) {
      paymentSession = data;
    }
  } else if (userId) {
    const { data, error } = await supabase
      .from("payment_sessions")
      .select("*")
      .eq("user_id", userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching payment session by user ID:', error);
    } else if (data) {
      paymentSession = data;
    }
  }
  
  if (!paymentSession) {
    return { success: false, error: "No payment session found" };
  }
  
  // Clean up the payment session
  const { error: deleteError } = await supabase
    .from("payment_sessions")
    .delete()
    .eq("id", paymentSession.id);
    
  if (deleteError) {
    console.error('Error deleting payment session:', deleteError);
    return { success: false, error: "Failed to delete payment session" };
  }
  
  return { 
    success: true, 
    message: `Payment session cleaned up successfully`, 
    paymentSession 
  };
}

// Helper to format date as DDMMYYYY
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}${month}${year}`;
}
