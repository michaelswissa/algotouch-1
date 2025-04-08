
import React, { useState } from 'react';
import DigitalContractForm from '@/components/DigitalContractForm';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth';

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
  const [isSigning, setIsSigning] = useState(false);
  const { user } = useAuth();
  
  const handleSignContract = async () => {
    try {
      setIsProcessing(true);
      console.log('Contract signed, forwarding data to parent component');
      
      const signatureElement = document.getElementById('signature') as HTMLCanvasElement;
      const contractHtmlElement = document.getElementById('contractHtml') as HTMLDivElement;
      const agreedToTermsElement = document.getElementById('agreedToTerms') as HTMLInputElement;
      const agreedToPrivacyElement = document.getElementById('agreedToPrivacy') as HTMLInputElement;
      
      if (signatureElement && contractHtmlElement) {
        const signature = signatureElement.toDataURL();
        const contractHtml = contractHtmlElement.innerHTML;
        const agreedToTerms = agreedToTermsElement.checked;
        const agreedToPrivacy = agreedToPrivacyElement.checked;
        
        const contractData = {
          signature,
          contractHtml,
          agreedToTerms,
          agreedToPrivacy,
          contractVersion: "1.0",
          browserInfo: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        };

        // Store the contract ID in local storage as a fallback
        try {
          // Generate a temporary contract ID
          const tempContractId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          localStorage.setItem('temp_contract_id', tempContractId);
          
          // Also keep a local copy of the contract HTML for immediate access
          localStorage.setItem('temp_contract_html', contractHtml);
        } catch (storageError) {
          console.error('Error saving contract to local storage:', storageError);
          // Continue anyway
        }
        
        setIsSigning(false);
        onSign(contractData);
      }
    } catch (error) {
      console.error('Error signing contract:', error);
    } finally {
      setIsProcessing(false);
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
