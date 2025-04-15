
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const useContractValidation = () => {
  const navigate = useNavigate();

  const validateContract = () => {
    // Get contract data - required before payment
    const contractData = sessionStorage.getItem('contract_data');
    const contractDetails = contractData ? JSON.parse(contractData) : null;

    if (!contractDetails) {
      console.error("Missing contract data");
      toast.error('נדרשת חתימה על החוזה');
      navigate('/subscription');
      return null;
    }

    return contractDetails;
  };

  return { validateContract };
};
