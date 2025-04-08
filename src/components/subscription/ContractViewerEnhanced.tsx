import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { getContractById } from '@/lib/contracts/db-service';
import { Button } from '@/components/ui/button';
import { FileText, Download, AlertCircle, ExternalLink, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface ContractViewerProps {
  userId?: string;
  contractId?: string;
  onBack?: () => void;
  className?: string;
}

const ContractViewerEnhanced: React.FC<ContractViewerProps> = ({ 
  userId: externalUserId, 
  contractId: externalContractId,
  onBack, 
  className 
}) => {
  const { user } = useAuth();
  const [contractHtml, setContractHtml] = useState<string | null>(null);
  const [contractData, setContractData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  const userId = externalUserId || user?.id;
  const contractUrlRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchContract() {
      if (!userId && !externalContractId) {
        setError('משתמש לא מזוהה ומזהה הסכם חסר');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        console.log('Fetching contract:', { userId, externalContractId });
        
        // Try to get contract from session storage first (for users in registration flow)
        const registrationData = sessionStorage.getItem('registration_data');
        if (registrationData) {
          try {
            const parsedData = JSON.parse(registrationData);
            if (parsedData.contractDetails?.contractHtml) {
              console.log('Found contract in registration data');
              setContractHtml(parsedData.contractDetails.contractHtml);
              setContractData({
                id: 'temp_contract',
                full_name: `${parsedData.userData?.firstName || ''} ${parsedData.userData?.lastName || ''}`.trim(),
                email: parsedData.email,
                created_at: new Date().toISOString(),
                signature: parsedData.contractDetails.signature
              });
              setLoading(false);
              return;
            }
          } catch (parseError) {
            console.error('Error parsing registration data:', parseError);
          }
        }
        
        // If temp storage didn't work or we're in normal flow, fetch from database
        // If a specific contract ID is provided, fetch that contract
        if (externalContractId) {
          const { success, contract, error: fetchError } = await getContractById(externalContractId);
          
          if (fetchError || !success) {
            console.error('Error fetching specific contract:', fetchError);
            setError('שגיאה בטעינת ההסכם');
            setLoading(false);
            return;
          }
          
          if (!contract || !contract.contract_html) {
            console.error('Contract not found or missing HTML content');
            setError('לא נמצא הסכם חתום או תוכן ההסכם חסר');
            setLoading(false);
            return;
          }
          
          console.log('Contract found:', { 
            id: contract.id, 
            hasHtml: !!contract.contract_html,
            hasPdf: !!contract.pdf_url
          });
          
          setContractData(contract);
          setContractHtml(contract.contract_html);
          setPdfUrl(contract.pdf_url);
          setLoading(false);
          return;
        }
        
        // If no specific contract, check if there's a contract in local storage
        const tempContractId = localStorage.getItem('temp_contract_id');
        if (tempContractId) {
          try {
            const { success, contract } = await getContractById(tempContractId);
            if (success && contract && contract.contract_html) {
              console.log('Found contract in local storage reference:', tempContractId);
              setContractData(contract);
              setContractHtml(contract.contract_html);
              setPdfUrl(contract.pdf_url);
              setLoading(false);
              return;
            }
          } catch (localStorageError) {
            console.error('Error fetching contract from local storage reference:', localStorageError);
          }
        }
        
        // Otherwise, find the latest contract for this user from database
        if (userId) {
          const { success, contract } = await getContractById(userId);
          if (success && contract) {
            setContractData(contract);
            setContractHtml(contract.contract_html);
            setPdfUrl(contract.pdf_url);
            setLoading(false);
            return;
          }
        }
        
        // If we reach here, no contract was found
        setError('לא נמצא הסכם חתום');
      } catch (err) {
        console.error('Error fetching contract:', err);
        setError('שגיאה בטעינת ההסכם');
      } finally {
        setLoading(false);
      }
    }
    
    fetchContract();
  }, [userId, externalContractId]);

  // Function to download the contract as an HTML file
  const downloadContract = () => {
    if (!contractHtml || !contractData) return;
    
    const element = document.createElement('a');
    
    // Enhance the HTML with additional metadata
    const enhancedHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>הסכם חתום - ${contractData.full_name || 'לקוח'}</title>
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
          h2 { color: #333; }
          .signature-block { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 20px; }
          .metadata { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h2>הסכם חתום</h2>
        <p>תאריך חתימה: ${new Date(contractData.created_at).toLocaleDateString('he-IL')}</p>
        
        <div class="contract-content">
          ${contractHtml}
        </div>
        
        <div class="signature-block">
          <h3>פרטי החותם:</h3>
          <p><strong>שם מלא:</strong> ${contractData.full_name || 'לא צוין'}</p>
          <p><strong>אימייל:</strong> ${contractData.email || 'לא צוין'}</p>
          <p><strong>כתובת:</strong> ${contractData.address || 'לא צוין'}</p>
          <p><strong>טלפון:</strong> ${contractData.phone || 'לא צוין'}</p>
          ${contractData.signature ? `<p><strong>חתימה:</strong><br><img src="${contractData.signature}" alt="חתימה דיגיטלית" style="max-width: 300px; border: 1px solid #eee;" /></p>` : ''}
          <p><strong>תאריך חתימה:</strong> ${new Date(contractData.created_at).toLocaleString('he-IL')}</p>
        </div>
        
        <div class="metadata">
          <h4>מידע נוסף:</h4>
          <p>מזהה הסכם: ${contractData.id}</p>
          <p>גרסת הסכם: ${contractData.contract_version || '1.0'}</p>
          <p>הוסכם לתנאי שימוש: ${contractData.agreed_to_terms ? 'כן' : 'לא'}</p>
          <p>הוסכם למדיניות פרטיות: ${contractData.agreed_to_privacy ? 'כן' : 'לא'}</p>
        </div>
      </body>
      </html>
    `;
    
    const file = new Blob([enhancedHtml], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = `contract-${contractData.full_name || 'user'}-${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  // Function to copy link to clipboard
  const copyContractLink = () => {
    if (!contractData || !contractUrlRef.current) return;
    
    contractUrlRef.current.select();
    document.execCommand('copy');
    toast.success('הקישור הועתק בהצלחה!');
  };

  // Generate a shareable contract URL
  const getContractUrl = () => {
    if (!contractData?.id) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/contract/${contractData.id}`;
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
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button onClick={downloadContract} variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  הורד עותק של ההסכם
                </Button>
                
                {pdfUrl && (
                  <Button variant="outline" className="flex items-center gap-2" asChild>
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      פתח PDF
                    </a>
                  </Button>
                )}
              </div>
              
              {contractData?.id && contractData.id !== 'temp_contract' && (
                <div className="mt-4 flex flex-col items-center">
                  <p className="text-sm mb-2">קישור לשיתוף ההסכם:</p>
                  <div className="flex w-full max-w-md">
                    <input
                      ref={contractUrlRef}
                      type="text"
                      readOnly
                      value={getContractUrl()}
                      className="flex-1 p-2 text-xs border rounded-l-md bg-white"
                    />
                    <Button 
                      onClick={copyContractLink}
                      variant="secondary"
                      className="rounded-l-none"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
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
      </CardContent>
      
      {onBack && (
        <CardFooter className="justify-end">
          <Button onClick={onBack} variant="outline">חזור</Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default ContractViewerEnhanced;
