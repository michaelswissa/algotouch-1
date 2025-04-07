
import React from 'react';
import ContractSection from '@/components/subscription/ContractSection';

interface ContractViewProps {
  selectedPlan: string;
  fullName: string;
  onComplete: (contractId: string) => void;
  onBack: () => void;
}

const ContractView: React.FC<ContractViewProps> = ({
  selectedPlan,
  fullName,
  onComplete,
  onBack
}) => {
  return (
    <ContractSection
      selectedPlan={selectedPlan}
      fullName={fullName}
      onSign={onComplete}
      onBack={onBack}
    />
  );
};

export default ContractView;
