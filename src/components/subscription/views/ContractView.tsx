
import React from 'react';
import ContractSection from '@/components/subscription/ContractSection';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

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
  const { user } = useAuth();

  const handleContractSign = (contractData: any) => {
    // Additional validation to ensure we have a plan selected
    if (!selectedPlan) {
      console.error("Cannot sign contract: No plan selected");
      toast.error('אנא בחר תכנית מנוי תחילה');
      onBack(); // Go back to plan selection
      return;
    }
    
    // Check if we have registration data in the session (for users in the signup flow)
    const registrationData = sessionStorage.getItem('registration_data');
    const isRegistering = registrationData ? true : false;

    // If user is not authenticated and we're not in the registration flow, show error
    if (!user?.id && !isRegistering) {
      toast.error('משתמש לא מזוהה. אנא התחבר או הירשם תחילה.');
      return;
    }
    
    // Add the plan ID to the contract data
    const enhancedContractData = {
      ...contractData,
      planId: selectedPlan,
    };
    
    // Generate temp contract ID for session storage
    if (isRegistering) {
      enhancedContractData.tempContractId = `temp_contract_${Date.now()}`;
      console.log('Generated temp contract ID:', enhancedContractData.tempContractId);
    } else {
      console.log('User is authenticated, using regular contract flow');
    }
    
    console.log('Contract signed, sending data to parent component', { 
      planId: selectedPlan, 
      isRegistering, 
      hasUserId: !!user?.id 
    });
    
    // Pass the data to the parent component
    onComplete(enhancedContractData);
  };

  return (
    <ContractSection
      selectedPlan={selectedPlan}
      fullName={fullName}
      onSign={handleContractSign}
      onBack={onBack}
    />
  );
};

export default ContractView;
