
import React, { useState } from 'react';
import DigitalContractForm from '@/components/DigitalContractForm';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth';
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
  const { isAuthenticated } = useAuth();
  
  // Function to handle contract signing
  const handleSignContract = async (contractData: any) => {
    try {
      setIsProcessing(true);
      console.log('Contract signed, saving before payment');
      
      // Get existing registration data if available
      const registrationData = sessionStorage.getItem('registration_data');
      const parsedRegistrationData = registrationData ? JSON.parse(registrationData) : null;
      
      // Save contract data to session storage for use during payment
      const contractStateData = {
        ...contractData,
        registrationData: parsedRegistrationData,
        contractSignedAt: new Date().toISOString(),
        isAuthenticated,
        selectedPlan
      };
      
      // Save contract state in session storage and ensure it persists
      sessionStorage.setItem('contract_data', JSON.stringify(contractStateData));
      
      // Add a small delay to show the processing state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Pass the contract data up to the parent
      onSign(contractStateData);
    } catch (error) {
      console.error('Error signing contract:', error);
      toast.error('אירעה שגיאה בשמירת החוזה');
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
