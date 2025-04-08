
import React, { useState } from 'react';
import DigitalContractForm from '@/components/DigitalContractForm';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth';
import { downloadContract } from '@/lib/contracts/izidoc-service';
import { saveContractToLocalStorage } from '@/lib/contracts/email-service';
import { toast } from 'sonner';

interface ContractSectionProps {
  selectedPlan: string;
  fullName: string;
  onSign: (contractData: any) => void;
  onBack: () => void;
}

const ContractSection: React.FC<ContractSectionProps> = ({ 
  selectedPlan, 
  fullName, 
  onSign, 
  onBack 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [contractHtml, setContractHtml] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Function to handle contract signing
  const handleSignContract = async (contractData: any) => {
    try {
      setIsProcessing(true);
      console.log('Contract signed, forwarding data to parent component');
      
      // Store contract HTML for potential download
      setContractHtml(contractData.contractHtml);
      
      // Save contract to localStorage as an immediate backup
      const tempId = `temp_${Date.now()}`;
      saveContractToLocalStorage(tempId, contractData.contractHtml);
      
      // Add a small delay to show the processing state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Pass the contract data directly to the parent along with user information
      onSign({
        ...contractData,
        userId: user?.id // This will be undefined if the user isn't authenticated
      });
    } catch (error) {
      console.error('Error signing contract:', error);
      toast.error('אירעה שגיאה בעת חתימת החוזה');
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to download the contract
  const handleDownloadContract = () => {
    if (contractHtml) {
      const success = downloadContract(contractHtml, fullName);
      if (success) {
        toast.success('החוזה הורד בהצלחה');
      } else {
        toast.error('אירעה שגיאה בהורדת החוזה');
      }
    } else {
      toast.error('אין חוזה זמין להורדה');
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          אנא קרא את ההסכם בעיון וחתום במקום המיועד בתחתית העמוד
        </AlertDescription>
      </Alert>
      
      <DigitalContractForm 
        onSign={handleSignContract}
        planId={selectedPlan} 
        fullName={fullName} 
      />
      
      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isProcessing}>
          חזור
        </Button>
        
        {contractHtml && (
          <Button 
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleDownloadContract}
          >
            <Download className="h-4 w-4" /> 
            הורד עותק
          </Button>
        )}
        
        {isProcessing && (
          <div className="flex items-center text-sm text-muted-foreground">
            מעבד את החתימה...
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractSection;
