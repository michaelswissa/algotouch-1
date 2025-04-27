
import { getRegistrationData } from '@/lib/registration/registration-service';

export const validatePlanSelection = (selectedPlan?: string): boolean => {
  return !!selectedPlan;
};

export const validateContractData = (): boolean => {
  const contractData = sessionStorage.getItem('contract_data');
  if (!contractData) return false;
  
  try {
    const parsed = JSON.parse(contractData);
    return !!(parsed.signature && parsed.contractHtml && 
              parsed.agreedToTerms && parsed.agreedToPrivacy);
  } catch {
    return false;
  }
};

export const validateRegistrationData = (): boolean => {
  const data = getRegistrationData();
  return !!(data.email && data.userData?.firstName && data.userData?.lastName);
};
