
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FileText, Download, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ContractViewerProps {
  userId?: string;
  onBack?: () => void;
  className?: string;
}

const ContractViewer: React.FC<ContractViewerProps> = ({ userId: externalUserId, onBack, className }) => {
  const { user } = useAuth();
  const [contractHtml, setContractHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const userId = externalUserId || user?.id;

  useEffect(() => {
    async function fetchContract() {
      if (!userId) {
        setError('משתמש לא מזוהה');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Fetch the contract HTML directly from the database
        const { data, error: fetchError } = await supabase
          .from('contract_signatures')
          .select('contract_html, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (fetchError) {
          console.error('Error fetching contract:', fetchError);
          setError('שגיאה בטעינת ההסכם');
          return;
        }
        
        if (!data || !data.contract_html) {
          setError('לא נמצא הסכם חתום');
          return;
        }
        
        setContractHtml(data.contract_html);
      } catch (err) {
        console.error('Error fetching contract:', err);
        setError('שגיאה בטעינת ההסכם');
      } finally {
        setLoading(false);
      }
    }
    
    fetchContract();
  }, [userId]);

  // Function to download the contract as an HTML file
  const downloadContract = () => {
    if (!contractHtml) return;
    
    const element = document.createElement('a');
    const file = new Blob([contractHtml], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = `contract-${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          הסכם חתום
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : contractHtml ? (
          <div className="space-y-4">
            <div className="border rounded-md p-4 bg-slate-50 dark:bg-slate-900">
              <p className="text-sm text-center mb-2">ההסכם נחתם ונשמר בהצלחה</p>
              <div className="flex justify-center">
                <Button onClick={downloadContract} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  הורד עותק של ההסכם
                </Button>
              </div>
            </div>
            <div className="w-full h-[400px] border rounded-md overflow-auto">
              <div className="p-4" dangerouslySetInnerHTML={{ __html: contractHtml }} />
            </div>
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>לא נמצא הסכם חתום</AlertDescription>
          </Alert>
        )}
        
        {onBack && (
          <div className="mt-4 flex justify-end">
            <Button onClick={onBack} variant="outline">חזור</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ContractViewer;
