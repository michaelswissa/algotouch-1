
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.14.0";
import { sendContractConfirmationEmail } from "./email-service.ts";

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

interface GenerateDocumentParams {
  paymentId: string;
  userId: string;
  amount: number;
  planType: string;
  email: string;
  fullName: string;
  documentType: 'invoice' | 'receipt';
  taxId?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  phone?: string;
}

/**
 * Generate document via CardCom API
 */
async function generateCardcomDocument(params: GenerateDocumentParams) {
  // CardCom API configuration
  const API_CONFIG = {
    TERMINAL: Deno.env.get('CARDCOM_TERMINAL'),
    USERNAME: Deno.env.get('CARDCOM_USERNAME'),
    PASSWORD: Deno.env.get('CARDCOM_API_PASSWORD'),
    BASE_URL: 'https://secure.cardcom.solutions/api/v11',
  };

  try {
    // Calculate VAT (if needed)
    const isVatFree = false; // Set to true for VAT exempt customers

    // Prepare document request payload
    const payload = {
      ApiName: API_CONFIG.USERNAME,
      ApiPassword: API_CONFIG.PASSWORD,
      Document: {
        DocumentTypeToCreate: params.documentType === 'invoice' ? 'Invoice' : 'Receipt',
        Name: params.fullName,
        TaxId: params.taxId || '',
        Email: params.email,
        IsSendByEmail: true,
        AddressLine1: params.addressLine1 || '',
        AddressLine2: params.addressLine2 || '',
        City: params.city || '',
        Mobile: params.phone || '',
        Comments: `Subscription: ${params.planType.toUpperCase()}`,
        IsVatFree: isVatFree,
        Products: [
          {
            ProductName: `${params.planType.toUpperCase()} Subscription`,
            PriceIncludeVAT: params.amount,
            Quantity: 1,
          }
        ],
        ExternalId: params.paymentId,
        ISOCoinID: 1, // ILS
        Languge: 'he'  // Hebrew language
      }
    };

    console.log(`Creating ${params.documentType} for payment ${params.paymentId}`);
    
    // Call CardCom API to create document
    const response = await fetch(`${API_CONFIG.BASE_URL}/Documents/CreateDocument`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CardCom API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.ResponseCode !== 0) {
      throw new Error(`CardCom error: ${result.Description || 'Unknown error'}`);
    }

    // Return document information
    return {
      success: true,
      documentType: result.DocumentType,
      documentNumber: result.DocumentNumber,
      documentUrl: result.DocumentUrl
    };
  } catch (error: any) {
    console.error('Error generating document:', error);
    throw error;
  }
}

/**
 * Store document details in database
 */
async function storeDocumentDetails(
  supabase: any, 
  params: GenerateDocumentParams, 
  documentInfo: { documentType: string; documentNumber: number; documentUrl: string }
) {
  try {
    // Store document in documents table
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .insert({
        user_id: params.userId,
        payment_id: params.paymentId,
        document_type: params.documentType,
        document_number: documentInfo.documentNumber.toString(),
        document_url: documentInfo.documentUrl,
        document_date: new Date().toISOString(),
        metadata: {
          amount: params.amount,
          plan_type: params.planType,
          cardcom_doc_type: documentInfo.documentType
        }
      })
      .select()
      .single();

    if (documentError) {
      throw documentError;
    }

    // Update payment history record with document info
    const { error: paymentError } = await supabase
      .from('payment_history')
      .update({
        document_url: documentInfo.documentUrl,
        document_number: documentInfo.documentNumber.toString()
      })
      .eq('id', params.paymentId);

    if (paymentError) {
      throw paymentError;
    }

    return { success: true, document };
  } catch (error) {
    console.error('Error storing document details:', error);
    throw error;
  }
}

/**
 * Send document notification email
 */
async function sendDocumentEmail(
  email: string, 
  fullName: string, 
  documentType: string,
  documentNumber: string,
  documentUrl: string
) {
  try {
    // Use email service to send notification
    const emailData = {
      email,
      fullName,
      documentType: documentType === 'invoice' ? 'חשבונית' : 'קבלה',
      documentNumber,
      documentUrl,
      date: new Date().toLocaleDateString('he-IL')
    };

    // For this example, we'll reuse the contract confirmation email function
    // In a real implementation, you'd create a separate email template
    await sendContractConfirmationEmail(email, fullName, emailData.date);

    return { success: true };
  } catch (error) {
    console.error('Error sending document email:', error);
    return { success: false, error };
  }
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Extract request path and data
    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    // Handle generation request
    if (path === 'generate' && req.method === 'POST') {
      const {
        paymentId,
        userId,
        amount,
        planType,
        email,
        fullName,
        documentType,
        taxId,
        addressLine1,
        addressLine2,
        city,
        phone
      } = await req.json();

      // Validate required fields
      if (!paymentId || !userId || !amount || !planType || !email || !fullName || !documentType) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing required fields' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }

      // 1. Generate document through CardCom API
      const documentInfo = await generateCardcomDocument({
        paymentId,
        userId,
        amount,
        planType,
        email,
        fullName,
        documentType,
        taxId,
        addressLine1,
        addressLine2,
        city,
        phone
      });

      // 2. Store document info in database
      const storeResult = await storeDocumentDetails(
        supabaseClient,
        { paymentId, userId, amount, planType, email, fullName, documentType },
        documentInfo
      );

      // 3. Send email notification
      await sendDocumentEmail(
        email,
        fullName,
        documentType,
        documentInfo.documentNumber.toString(),
        documentInfo.documentUrl
      );

      // Return success response
      return new Response(
        JSON.stringify({ 
          success: true,
          documentType: documentInfo.documentType,
          documentNumber: documentInfo.documentNumber,
          documentUrl: documentInfo.documentUrl
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Handle query for user documents
    if (path === 'list' && req.method === 'POST') {
      const { userId } = await req.json();

      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing user ID' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }

      // Query user documents
      const { data, error } = await supabaseClient
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500 
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, documents: data }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Invalid endpoint
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid endpoint' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  } catch (error: any) {
    console.error('Error in generate-document function:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'An error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
