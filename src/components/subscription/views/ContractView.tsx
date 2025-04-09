
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

  const handleContractSign = async (contractData: any) => {
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
      console.error('User not authenticated and not in registration flow');
      toast.error('משתמש לא מזוהה. אנא התחבר או הירשם תחילה.');
      return;
    }
    
    console.log('Contract signing initiated', { 
      hasUserId: !!user?.id, 
      isRegistering, 
      planId: selectedPlan 
    });
    
    // Add the plan ID to the contract data
    const enhancedContractData = {
      ...contractData,
      planId: selectedPlan,
      // Add browser info for audit purposes
      browserInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
    
    // Generate temp contract ID for session storage if in registration flow
    if (isRegistering) {
      enhancedContractData.tempContractId = `temp_contract_${Date.now()}`;
      console.log('Generated temp contract ID:', enhancedContractData.tempContractId);
      
      try {
        // Parse registration data to update with contract info
        const parsedRegistrationData = JSON.parse(registrationData);
        parsedRegistrationData.contractDetails = enhancedContractData;
        parsedRegistrationData.planId = selectedPlan;
        sessionStorage.setItem('registration_data', JSON.stringify(parsedRegistrationData));
        console.log('Updated registration data with contract details');
      } catch (error) {
        console.error('Error updating registration data with contract:', error);
        // Continue with the flow even if this fails
      }
    } else {
      console.log('User is authenticated, using regular contract flow');
    }
    
    console.log('Contract signed, sending data to parent component', { 
      planId: selectedPlan, 
      isRegistering, 
      hasUserId: !!user?.id,
      contractDataSize: JSON.stringify(enhancedContractData).length
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
