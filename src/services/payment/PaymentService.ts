
import { supabase } from '@/integrations/supabase/client';
import { PaymentSessionData, CardComPaymentResponse, PaymentError, CardOwnerDetails } from '@/components/payment/types/payment';
import { StorageService } from '@/services/storage/StorageService';
import { PaymentLogger } from './PaymentLogger';

export class PaymentService {
  /**
   * Initialize a CardCom payment session for iframe-based payments
   */
  static async initializePayment(planId: string): Promise<PaymentSessionData> {
    try {
      PaymentLogger.log('Initializing payment', { planId });
      
      // Get user information from storage
      const registrationData = StorageService.getRegistrationData();
      const contractData = StorageService.getContractData();
      
      if (!contractData) {
        throw new Error('Contract data missing. Please complete the contract step first.');
      }

      // Calculate amount based on plan
      let amount = 0;
      switch (planId) {
        case 'monthly':
          amount = 371;
          break;
        case 'annual':
          amount = 3371;
          break;
        case 'vip':
          amount = 13121;
          break;
        default:
          throw new Error(`Unsupported plan: ${planId}`);
      }

      // Determine operation type based on plan
      const operation = planId === 'monthly' ? 'ChargeAndCreateToken' : 'ChargeOnly';

      // Call Supabase Edge Function to initialize payment with isIframePrefill=true
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          planId,
          amount,
          operation,
          invoiceInfo: {
            fullName: contractData.fullName || registrationData?.userData?.firstName + ' ' + registrationData?.userData?.lastName,
            email: contractData.email || registrationData?.email,
          },
          redirectUrls: {
            success: `${window.location.origin}/subscription/success`,
            failed: `${window.location.origin}/subscription/failed`
          },
          userId: registrationData?.userId,
          registrationData,
          isIframePrefill: true // This is key to use OpenFields instead of redirect
        }
      });

      if (error) {
        PaymentLogger.error('Payment initialization error', error);
        throw new Error(error.message || 'Failed to initialize payment session');
      }

      if (!data?.success) {
        PaymentLogger.error('Payment initialization failed', data?.message);
        throw new Error(data?.message || 'Failed to initialize payment session');
      }

      PaymentLogger.log('Payment initialized successfully', data.data);
      return data.data;
    } catch (error) {
      PaymentLogger.error('Exception during payment initialization', error);
      throw error;
    }
  }

  /**
   * Submit payment information to CardCom
   */
  static async submitPayment(params: {
    lowProfileCode: string;
    terminalNumber: string;
    operationType: 'payment' | 'token_only';
    cardOwnerDetails: CardOwnerDetails;
  }): Promise<boolean> {
    try {
      PaymentLogger.log('Submitting payment', { 
        lowProfileCode: params.lowProfileCode,
        operationType: params.operationType 
      });
      
      const { data, error } = await supabase.functions.invoke('cardcom-submit', {
        body: {
          lowProfileCode: params.lowProfileCode,
          terminalNumber: params.terminalNumber,
          operation: params.operationType === 'token_only' ? 'ChargeAndCreateToken' : 'ChargeOnly',
          cardOwnerDetails: params.cardOwnerDetails
        }
      });

      if (error || !data?.success) {
        PaymentLogger.error('Payment submission error', error || data?.message);
        throw new Error(error?.message || data?.message || 'Failed to process payment');
      }

      PaymentLogger.log('Payment submitted successfully', data);
      return true;
    } catch (error) {
      PaymentLogger.error('Exception during payment submission', error);
      throw error;
    }
  }

  /**
   * Check the status of a payment transaction
   */
  static async checkPaymentStatus(lowProfileCode: string): Promise<boolean> {
    try {
      if (!lowProfileCode) {
        PaymentLogger.error('Missing lowProfileCode for status check');
        return false;
      }

      PaymentLogger.log('Checking payment status', { lowProfileCode });
      
      const { data, error } = await supabase.functions.invoke('cardcom-status', {
        body: { lowProfileCode }
      });

      if (error) {
        PaymentLogger.error('Error checking payment status', error);
        return false;
      }

      PaymentLogger.log('Payment status check result', data);
      return data?.success || false;
    } catch (error) {
      PaymentLogger.error('Exception during payment status check', error);
      return false;
    }
  }
}
