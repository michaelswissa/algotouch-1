
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { toast } from 'sonner';
import { processSignedContract } from '@/lib/contracts/contract-service';
import { getRegistrationData, storeRegistrationData } from '@/lib/registration/registration-service';

interface ContractData {
  signature: string;
  contractHtml: string;
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
  contractVersion?: string;
  browserInfo?: {
    userAgent: string;
    language: string;
    platform: string;
    screenSize: string;
    timeZone: string;
  };
}

export const useSubscriptionFlow = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { fullName, email, checkUserSubscription } = useSubscriptionContext();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePlanSelect = useCallback((planId: string) => {
    console.log('Selected plan:', planId);
    storeRegistrationData({ planId });
    return true;
  }, []);

  const handleContractSign = useCallback(async (contractData: ContractData) => {
    console.log('Processing contract signature');
    setIsProcessing(true);

    try {
      const registrationData = getRegistrationData();
      
      // Store contract data
      const contractStateData = {
        ...contractData,
        registrationData,
        contractSignedAt: new Date().toISOString(),
        isAuthenticated
      };
      
      sessionStorage.setItem('contract_data', JSON.stringify(contractStateData));
      
      // If user is authenticated, process contract
      if (isAuthenticated && user) {
        const userData = registrationData?.userData || {};
        const userEmail = email || contractData.email || registrationData?.email || '';
        const userFullName = fullName || contractData.fullName || 
          `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        
        if (userEmail && registrationData?.planId) {
          const success = await processSignedContract(
            user.id,
            registrationData.planId,
            userFullName,
            userEmail,
            contractData
          );
          
          if (success) {
            toast.success('ההסכם נחתם בהצלחה!');
            return true;
          }
        } else {
          console.error('Missing required data for contract', { userEmail, planId: registrationData?.planId });
          toast.error('חסרים נתונים לעיבוד ההסכם');
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error processing contract:', error);
      toast.error('אירעה שגיאה בתהליך החתימה');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [isAuthenticated, user, email, fullName]);

  const handlePaymentComplete = useCallback(async () => {
    if (user) {
      await checkUserSubscription(user.id);
    }
    return true;
  }, [user, checkUserSubscription]);

  return {
    isProcessing,
    handlePlanSelect,
    handleContractSign,
    handlePaymentComplete
  };
};
