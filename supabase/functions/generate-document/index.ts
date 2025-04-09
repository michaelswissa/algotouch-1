
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocumentRequest {
  paymentId: string;
  userId: string;
  amount: number;
  planType: string;
  email: string;
  fullName: string;
  documentType: 'invoice' | 'receipt';
  taxId?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Get the API endpoint from the URL path
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const endpoint = pathSegments.length > 1 ? pathSegments[1] : "unknown";

  // Initialize the Supabase client with the Service Role Key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Route to the appropriate handler based on the endpoint
    switch (endpoint) {
      case "generate":
        return await handleGenerateDocument(req, supabase);
      case "list":
        return await handleListDocuments(req, supabase);
      case "details":
        return await handleGetDocumentDetails(req, supabase);
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  } catch (error) {
    console.error(`Error in generate-document/${endpoint}:`, error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message || "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleGenerateDocument(req: Request, supabase: any) {
  // Parse request body
  const requestData: DocumentRequest = await req.json();
  
  // Validate required fields
  const { paymentId, userId, amount, planType, email, fullName, documentType } = requestData;
  if (!paymentId || !userId || !amount || !planType || !email || !fullName || !documentType) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing required fields" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // In a real implementation, this would call the CardCom API to generate a document
  // For this demo, we'll simulate document generation and just create a record
  
  // Generate document number and URL (in real implementation these would come from CardCom)
  const documentNumber = `${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;
  const documentUrl = `https://example.com/documents/${documentType}/${documentNumber}.pdf`;
  
  // Store the document in the database
  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      payment_id: paymentId,
      document_type: documentType,
      document_number: documentNumber,
      document_url: documentUrl,
      document_date: new Date().toISOString(),
      metadata: {
        amount,
        planType,
        email,
        fullName,
        phone: requestData.phone || null,
        addressLine1: requestData.addressLine1 || null,
        addressLine2: requestData.addressLine2 || null,
        city: requestData.city || null
      }
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error storing document:", error);
    throw new Error(`Failed to store document: ${error.message}`);
  }
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      documentId: data.id,
      documentNumber,
      documentUrl,
      documentType
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function handleListDocuments(req: Request, supabase: any) {
  // Parse request body
  const { userId } = await req.json();
  
  if (!userId) {
    return new Response(
      JSON.stringify({ success: false, error: "User ID is required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
  
  // Fetch documents for the user
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("Error fetching documents:", error);
    throw new Error(`Failed to fetch documents: ${error.message}`);
  }
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      documents: data || []
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function handleGetDocumentDetails(req: Request, supabase: any) {
  // Parse request body
  const { documentId } = await req.json();
  
  if (!documentId) {
    return new Response(
      JSON.stringify({ success: false, error: "Document ID is required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
  
  // Fetch document details
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();
  
  if (error) {
    console.error("Error fetching document details:", error);
    throw new Error(`Failed to fetch document: ${error.message}`);
  }
  
  // If document doesn't exist
  if (!data) {
    return new Response(
      JSON.stringify({ success: false, error: "Document not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      document: data
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
