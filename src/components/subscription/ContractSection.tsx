
import React, { useState } from 'react';
import DigitalContractForm from '@/components/DigitalContractForm';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth';
import { sendContractConfirmationEmail } from '@/lib/contracts/email-service';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Function to handle contract signing
  const handleSignContract = async (contractData: any) => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      console.log('Contract signed, forwarding data to parent component');
      
      // Add a small delay to show the processing state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Send confirmation email if we have user data
      if (user?.email) {
        // Non-blocking email sending
        sendContractConfirmationEmail(
          user.email,
          fullName || contractData.fullName,
          new Date().toISOString()
        ).catch(error => {
          console.error('Error sending confirmation email:', error);
          // Non-critical error, we can continue
        });
      }
      
      // Pass the contract data directly to the parent along with user information
      onSign({
        ...contractData,
        userId: user?.id, // This will be undefined if the user isn't authenticated
        signedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error signing contract:', error);
      setErrorMessage('שגיאה בעיבוד החוזה, אנא נסה שנית');
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
      
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}
      
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
