
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
    // Check if the documents table exists first
    const { error: checkError } = await supabase
      .rpc('check_row_exists', {
        p_table_name: 'documents',
        p_column_name: 'id', 
        p_value: 'any'
      });
      
    if (checkError) {
      console.warn('Documents table may not exist yet:', checkError.message);
      return { 
        success: true, 
        documents: [] 
      };
    }
    
    // If the table exists, query documents
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return { 
      success: true, 
      documents: documents || [] 
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
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .maybeSingle();
      
    if (error) throw error;
    
    return { 
      success: true, 
      document: data 
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
      .maybeSingle();
      
    if (userError) throw userError;
    
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
