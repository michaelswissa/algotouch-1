import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { getContractById, verifyContractSignature } from '@/lib/contracts/contract-service';
import { Button } from '@/components/ui/button';
import { FileText, Download, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getContractFromLocalStorage } from '@/lib/contracts/email-service';
import { downloadContract } from '@/lib/contracts/izidoc-service';
import { toast } from 'sonner';

interface ContractViewerProps {
  userId?: string;
  contractId?: string;
  onBack?: () => void;
  className?: string;
  contractHtml?: string; // Direct HTML content for immediate display
}

const ContractViewer: React.FC<ContractViewerProps> = ({ 
  userId: externalUserId, 
  contractId: externalContractId,
  contractHtml: directContractHtml,
  onBack, 
  className 
}) => {
  const { user } = useAuth();
  const [contractHtml, setContractHtml] = useState<string | null>(null);
  const [contractData, setContractData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localStorageBackups, setLocalStorageBackups] = useState<{id: string, timestamp: string}[]>([]);
  
  const userId = externalUserId || user?.id;

  // Check if we have registration data with contract
  const checkRegistrationData = () => {
    try {
      const registrationData = sessionStorage.getItem('registration_data');
      if (registrationData) {
        const parsedData = JSON.parse(registrationData);
        if (parsedData.contractDetails?.contractHtml) {
          console.log('Found contract in registration data');
          return {
            success: true,
            contract: {
              id: parsedData.contractDetails.tempContractId || 'temp_registration',
              contract_html: parsedData.contractDetails.contractHtml,
              full_name: parsedData.userData?.firstName + ' ' + parsedData.userData?.lastName || 'המשתמש',
              email: parsedData.email,
              created_at: parsedData.contractSignedAt || new Date().toISOString(),
              agreed_to_terms: parsedData.contractDetails.agreedToTerms || false,
              agreed_to_privacy: parsedData.contractDetails.agreedToPrivacy || false
            }
          };
        }
      }
      return { success: false };
    } catch (err) {
      console.error('Error parsing registration data:', err);
      return { success: false, error: err };
    }
  };

  // Check for local storage backups
  const checkLocalStorageBackups = () => {
    try {
      const backups: {id: string, timestamp: string}[] = [];
      
      // Check all localStorage keys for contract backups
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('contract_') && !key.endsWith('_timestamp')) {
          const id = key.replace('contract_', '');
          const timestamp = localStorage.getItem(`contract_${id}_timestamp`) || '';
          backups.push({ id, timestamp });
        }
      }
      
      // Sort backups by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return backups;
    } catch (err) {
      console.error('Error checking local storage backups:', err);
      return [];
    }
  };

  useEffect(() => {
    // If direct HTML is provided, use that immediately
    if (directContractHtml) {
      setContractHtml(directContractHtml);
      setContractData({
        id: 'direct_contract',
        created_at: new Date().toISOString(),
        full_name: 'Current User'
      });
      setLoading(false);
      return;
    }
    
    // Check for contract backups in localStorage
    const backups = checkLocalStorageBackups();
    setLocalStorageBackups(backups);
    
    async function fetchContract() {
      if (!userId && !externalContractId) {
        // Check registration data
        const registrationContract = checkRegistrationData();
        if (registrationContract.success) {
          setContractData(registrationContract.contract);
          setContractHtml(registrationContract.contract.contract_html);
          setLoading(false);
          return;
        }
        
        // Check for most recent backup in localStorage
        if (backups.length > 0) {
          const latestBackup = backups[0];
          const { html, timestamp } = getContractFromLocalStorage(latestBackup.id);
          if (html) {
            setContractHtml(html);
            setContractData({
              id: latestBackup.id,
              created_at: timestamp || new Date().toISOString(),
              full_name: 'Backup Contract'
            });
            setLoading(false);
            return;
          }
        }
        
        setError('משתמש לא מזוהה ומזהה הסכם חסר');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        console.log('Fetching contract:', { userId, externalContractId });
        
        // If a specific contract ID is provided, fetch that contract
        if (externalContractId) {
          const { success, contract, error: fetchError } = await getContractById(externalContractId);
          
          if (fetchError || !success) {
            console.error('Error fetching specific contract:', fetchError);
            
            // Try localStorage backup for this contract ID
            const { html, timestamp } = getContractFromLocalStorage(externalContractId);
            if (html) {
              console.log('Found contract in localStorage backup');
              setContractHtml(html);
              setContractData({
                id: externalContractId,
                created_at: timestamp || new Date().toISOString(),
                full_name: 'Backup Contract'
              });
              setLoading(false);
              return;
            }
            
            setError('שגיאה בטעינת ההסכם');
            setLoading(false);
            return;
          }
          
          if (!contract || !contract.contract_html) {
            console.error('Contract not found or missing HTML content');
            
            // Try localStorage backup for this contract ID
            const { html, timestamp } = getContractFromLocalStorage(externalContractId);
            if (html) {
              console.log('Found contract in localStorage backup');
              setContractHtml(html);
              setContractData({
                id: externalContractId,
                created_at: timestamp || new Date().toISOString(),
                full_name: 'Backup Contract'
              });
              setLoading(false);
              return;
            }
            
            setError('לא נמצא הסכם חתום או תוכן ההסכם חסר');
            setLoading(false);
            return;
          }
          
          console.log('Contract found:', { id: contract.id, hasHtml: !!contract.contract_html });
          setContractData(contract);
          setContractHtml(contract.contract_html);
          setLoading(false);
          return;
        }
        
        // Check registration data
        const registrationContract = checkRegistrationData();
        if (registrationContract.success) {
          setContractData(registrationContract.contract);
          setContractHtml(registrationContract.contract.contract_html);
          setLoading(false);
          return;
        }
        
        // Otherwise, find the latest contract for this user
        const { signed, contractId, signedAt } = await verifyContractSignature(userId);
        console.log('Contract verification result:', { signed, contractId, signedAt });
        
        if (!signed || !contractId) {
          // Check for user-specific backups in localStorage
          const userBackups = backups.filter(b => b.id.includes(userId));
          if (userBackups.length > 0) {
            const latestUserBackup = userBackups[0];
            const { html, timestamp } = getContractFromLocalStorage(latestUserBackup.id);
            if (html) {
              setContractHtml(html);
              setContractData({
                id: latestUserBackup.id,
                created_at: timestamp || new Date().toISOString(),
                full_name: 'Backup Contract'
              });
              setLoading(false);
              return;
            }
          }
          
          setError('לא נמצא הסכם חתום');
          setLoading(false);
          return;
        }
        
        // Fetch the contract details using the ID
        const { success, contract, error: fetchError } = await getContractById(contractId);
        
        if (fetchError || !success) {
          console.error('Error fetching contract by ID:', fetchError);
          
          // Try localStorage backup for this contract ID
          const { html, timestamp } = getContractFromLocalStorage(contractId);
          if (html) {
            console.log('Found contract in localStorage backup');
            setContractHtml(html);
            setContractData({
              id: contractId,
              created_at: timestamp || new Date().toISOString(),
              full_name: 'Backup Contract'
            });
            setLoading(false);
            return;
          }
          
          // Check for user-specific backups
          const userBackups = backups.filter(b => b.id.includes(userId));
          if (userBackups.length > 0) {
            const latestUserBackup = userBackups[0];
            const { html, timestamp } = getContractFromLocalStorage(latestUserBackup.id);
            if (html) {
              setContractHtml(html);
              setContractData({
                id: latestUserBackup.id,
                created_at: timestamp || new Date().toISOString(),
                full_name: 'Backup Contract'
              });
              setLoading(false);
              return;
            }
          }
          
          setError('שגיאה בטעינת ההסכם');
          setLoading(false);
          return;
        }
        
        if (!contract || !contract.contract_html) {
          console.error('Contract found but missing HTML content');
          
          // Try localStorage backup for this contract ID
          const { html, timestamp } = getContractFromLocalStorage(contractId);
          if (html) {
            console.log('Found contract in localStorage backup');
            setContractHtml(html);
            setContractData({
              id: contractId,
              created_at: timestamp || new Date().toISOString(),
              full_name: 'Backup Contract'
            });
            setLoading(false);
            return;
          }
          
          setError('תוכן ההסכם חסר');
          setLoading(false);
          return;
        }
        
        console.log('Contract loaded successfully');
        setContractData(contract);
        setContractHtml(contract.contract_html);
      } catch (err) {
        console.error('Error fetching contract:', err);
        
        // Check for most recent backup in localStorage
        if (backups.length > 0) {
          const latestBackup = backups[0];
          const { html, timestamp } = getContractFromLocalStorage(latestBackup.id);
          if (html) {
            setContractHtml(html);
            setContractData({
              id: latestBackup.id,
              created_at: timestamp || new Date().toISOString(),
              full_name: 'Backup Contract'
            });
            setLoading(false);
            return;
          }
        }
        
        setError('שגיאה בטעינת ההסכם');
      } finally {
        setLoading(false);
      }
    }
    
    fetchContract();
  }, [userId, externalContractId, directContractHtml]);

  // Function to download the contract as an HTML file
  const handleDownloadContract = () => {
    if (!contractHtml || !contractData) {
      toast.error('אין חוזה זמין להורדה');
      return;
    }
    
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

  // Function to restore contract from a local backup
  const handleLoadBackup = (backupId: string) => {
    const { html, timestamp } = getContractFromLocalStorage(backupId);
    if (html) {
      setContractHtml(html);
      setContractData({
        id: backupId,
        created_at: timestamp || new Date().toISOString(),
        full_name: 'Backup Contract'
      });
      setError(null);
      toast.success('הסכם שוחזר מגיבוי מקומי');
    } else {
      toast.error('לא ניתן לשחזר את הגיבוי');
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
          <>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            
            {localStorageBackups.length > 0 && (
              <div className="mt-4 border rounded-md p-4">
                <h3 className="font-medium mb-2">גיבויים מקומיים זמינים:</h3>
                <div className="space-y-2">
                  {localStorageBackups.slice(0, 5).map((backup) => (
                    <div key={backup.id} className="flex justify-between items-center text-sm">
                      <span>גיבוי מתאריך: {new Date(backup.timestamp).toLocaleString()}</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleLoadBackup(backup.id)}
                      >
                        טען גיבוי
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : contractHtml ? (
          <div className="space-y-4">
            <div className="border rounded-md p-4 bg-slate-50 dark:bg-slate-900">
              <p className="text-sm text-center mb-2">ההסכם נחתם ונשמר בהצלחה</p>
              <div className="flex justify-center">
                <Button onClick={handleDownloadContract} variant="outline" className="flex items-center gap-2">
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
