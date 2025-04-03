
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
  // Create a wrapper function that will call onSign with the contractData
  const handleSign = (contractData: any) => {
    onSign(contractData);
  };

  return (
    <div>
      <DigitalContractForm 
        onSign={handleSign} 
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
