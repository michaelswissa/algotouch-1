
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { getContractURL } from '@/lib/contracts/storage-service';
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
  const [contractUrl, setContractUrl] = useState<string | null>(null);
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
        const url = await getContractURL(userId);
        setContractUrl(url);
        if (!url) {
          setError('לא נמצא הסכם חתום');
        }
      } catch (err) {
        console.error('Error fetching contract:', err);
        setError('שגיאה בטעינת ההסכם');
      } finally {
        setLoading(false);
      }
    }
    
    fetchContract();
  }, [userId]);

  const downloadContract = () => {
    if (contractUrl) {
      window.open(contractUrl, '_blank');
    }
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
        ) : contractUrl ? (
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
            <div className="w-full">
              <iframe 
                src={contractUrl} 
                className="w-full border rounded-md" 
                style={{ height: '400px' }}
                title="הסכם"
              />
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
