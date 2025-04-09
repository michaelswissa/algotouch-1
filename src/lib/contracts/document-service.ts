
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Interface for document generation request
 */
export interface DocumentRequest {
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
 * Generate a document (invoice or receipt) for a payment
 */
export async function generateDocument(params: DocumentRequest): Promise<{ success: boolean; documentUrl?: string; error?: any }> {
  try {
    // Call the generate-document edge function
    const { data, error } = await supabase.functions.invoke('generate-document/generate', {
      body: params
    });
    
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'שגיאה ביצירת המסמך');
    
    return { 
      success: true, 
      documentUrl: data.documentUrl 
    };
  } catch (error: any) {
    console.error('Error generating document:', error);
    return { 
      success: false, 
      error: error.message || 'שגיאה ביצירת המסמך' 
    };
  }
}

/**
 * Get all documents for a user
 */
export async function getUserDocuments(userId: string): Promise<{ success: boolean; documents?: any[]; error?: any }> {
  try {
    // First check if the documents table exists and has RLS policies
    // Use the check_row_exists RPC instead of directly querying the table
    const { data: exists, error: checkError } = await supabase
      .rpc('check_row_exists', {
        p_table_name: 'documents',
        p_column_name: 'id', 
        p_value: 'any'
      });
      
    if (checkError || !exists) {
      console.warn('Documents table may not exist or has no records:', checkError?.message);
      return { 
        success: true, 
        documents: [] 
      };
    }
    
    // If the table exists and has records, use edge function to get documents
    const { data, error } = await supabase.functions.invoke('generate-document/list', {
      body: { userId }
    });
    
    if (error) throw error;
    
    return { 
      success: true, 
      documents: data?.documents || [] 
    };
  } catch (error: any) {
    console.error('Error fetching user documents:', error);
    return { 
      success: false, 
      error: error.message || 'שגיאה בטעינת מסמכים' 
    };
  }
}

/**
 * Get document details by ID
 */
export async function getDocumentById(documentId: string): Promise<{ success: boolean; document?: any; error?: any }> {
  try {
    // Use the edge function to get document details
    const { data, error } = await supabase.functions.invoke('generate-document/details', {
      body: { documentId }
    });
    
    if (error) throw error;
    
    return { 
      success: true, 
      document: data?.document 
    };
  } catch (error: any) {
    console.error(`Error fetching document ${documentId}:`, error);
    return { 
      success: false, 
      error: error.message || 'שגיאה בטעינת פרטי המסמך' 
    };
  }
}

/**
 * Handle document generation for new payment
 */
export async function handlePaymentDocumentGeneration(
  paymentId: string,
  userId: string,
  amount: number,
  planType: string
): Promise<{ success: boolean; documentUrl?: string; error?: any }> {
  try {
    // Get user information
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('first_name, last_name, email, phone')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('Error fetching user profile:', userError);
      return { success: false, error: 'שגיאה בטעינת פרטי משתמש' };
    }
    
    if (!userData) {
      console.warn('User profile not found for document generation', { userId });
      return { success: false, error: 'פרופיל משתמש לא נמצא' };
    }
    
    const email = userData?.email || '';
    const fullName = `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim();
    
    // Generate appropriate document based on plan type
    const documentType = planType === 'vip' ? 'receipt' : 'invoice';
    
    const { success, documentUrl, error } = await generateDocument({
      paymentId,
      userId,
      amount,
      planType,
      email,
      fullName,
      documentType,
      phone: userData?.phone
    });
    
    if (!success) throw error;
    
    toast.success(`ה${documentType === 'invoice' ? 'חשבונית' : 'קבלה'} נוצרה בהצלחה!`);
    
    return { success: true, documentUrl };
  } catch (error: any) {
    console.error('Error in payment document generation:', error);
    toast.error('שגיאה ביצירת מסמך תשלום');
    return { success: false, error };
  }
}
