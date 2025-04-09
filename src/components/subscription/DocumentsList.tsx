
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink, LoaderCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface Document {
  id: string;
  user_id: string;
  payment_id: string;
  document_type: string;
  document_number: string;
  document_url: string;
  document_date: string;
  created_at: string;
}

interface DocumentsListProps {
  userId: string;
}

const DocumentsList = ({ userId }: DocumentsListProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        // First check if the documents table exists
        const { error: checkError } = await supabase
          .from('documents')
          .select('count')
          .limit(1)
          .single();

        if (checkError && checkError.message.includes('relation "documents" does not exist')) {
          console.warn('Documents table does not exist yet. Creating it...');
          setDocuments([]);
          setLoading(false);
          return;
        }
        
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setDocuments(data as Document[] || []);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocuments();
  }, [userId]);
  
  if (loading) {
    return (
      <div className="flex flex-col items-center py-12">
        <LoaderCircle className="h-8 w-8 text-primary animate-spin" />
        <span className="mt-4 text-sm text-muted-foreground">טוען מסמכים...</span>
      </div>
    );
  }
  
  if (documents.length === 0) {
    return (
      <div className="text-center py-8 border rounded-lg bg-muted/30 p-6">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 mb-2 text-lg font-medium">אין מסמכים זמינים</p>
        <p className="text-sm text-muted-foreground mb-6">מסמכים יופיעו כאן לאחר ביצוע תשלום.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground mb-2">המסמכים שלך</div>
      <div className="border rounded-md overflow-hidden">
        <div className="bg-muted px-4 py-2 flex items-center justify-between text-sm font-medium">
          <span>סוג מסמך</span>
          <span>תאריך</span>
        </div>
        <div className="divide-y">
          {documents.map((doc) => (
            <div key={doc.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>
                  {doc.document_type === 'invoice' ? 'חשבונית' : 'קבלה'} #{doc.document_number}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {new Date(doc.document_date).toLocaleDateString('he-IL')}
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <a href={doc.document_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DocumentsList;
