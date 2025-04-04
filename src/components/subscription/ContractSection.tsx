
import React from 'react';
import DigitalContractForm from '@/components/DigitalContractForm';
import { Button } from '@/components/ui/button';

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
  // Function to handle contract signing
  const handleSignContract = (contractData: any) => {
    console.log('Contract signed, forwarding data to parent component');
    onSign(contractData);
  };

  return (
    <div className="space-y-6">
      <DigitalContractForm 
        onSign={handleSignContract}
        planId={selectedPlan} 
        fullName={fullName} 
      />
      
      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={onBack}>
          חזור
        </Button>
      </div>
    </div>
  );
};

export default ContractSection;
