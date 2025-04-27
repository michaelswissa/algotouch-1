
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export interface ContractData {
  fullName?: string;
  signature?: string;
  contractHtml?: string;
  email?: string; 
  agreedToTerms?: boolean;
  agreedToPrivacy?: boolean;
  contractVersion?: string;
  browserInfo?: {
    userAgent?: string;
    language?: string;
    platform?: string;
    screenSize?: string;
    timeZone?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

/**
 * Validates that contract data exists and is complete
 */
export function validateContractData(): ContractData | null {
  // Get contract data - required before payment
  const contractData = sessionStorage.getItem('contract_data');
  const contractDetails = contractData ? JSON.parse(contractData) : null;

  if (!contractDetails) {
    console.error("Missing contract data");
    return null;
  }

  // Validate required fields
  if (!contractDetails.signature || !contractDetails.contractHtml) {
    console.error("Invalid contract data: missing signature or contract HTML");
    return null;
  }

  if (!contractDetails.agreedToTerms || !contractDetails.agreedToPrivacy) {
    console.error("User has not agreed to terms or privacy policy");
    return null;
  }

  return contractDetails;
}

/**
 * Hook for contract validation with navigation support
 */
export function useContractValidation() {
  const navigate = useNavigate();

  const validateContract = (): ContractData | null => {
    const contractDetails = validateContractData();
    
    if (!contractDetails) {
      toast.error('נדרשת חתימה על החוזה');
      navigate('/subscription');
      return null;
    }

    return contractDetails;
  };

  return { validateContract };
}

/**
 * Stores contract data in session storage
 */
export function storeContractData(data: ContractData): boolean {
  try {
    // Add browser information if not provided
    if (!data.browserInfo) {
      data.browserInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }
    
    // Add timestamp if not provided
    if (!data.contractSignedAt) {
      data.contractSignedAt = new Date().toISOString();
    }
    
    sessionStorage.setItem('contract_data', JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error storing contract data:', error);
    return false;
  }
}
