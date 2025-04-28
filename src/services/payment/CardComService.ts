
import axios from 'axios';
import { CardOwnerDetails, CardComPaymentResponse, PaymentStatusType, PaymentStatus } from '@/types/payment';
import { validateCardOwnerDetails, validateCardExpiry } from '@/lib/payment/validators';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class CardComService {
  static async initializePayment(data: { planId: string; userId: string | null; email: string; fullName: string; operationType: string }): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/payment/initiate`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error initializing payment:', error);
      throw new Error(error.response?.data?.message || 'Failed to initialize payment');
    }
  }

  static async submitPayment(data: { lowProfileCode: string; terminalNumber: string; operationType: string; cardOwnerDetails: CardOwnerDetails }): Promise<boolean> {
    try {
      // No direct API call to CardCom here; the transaction is initiated via the iframe
      // This method might be used for post-processing or status updates in the future
      return true;
    } catch (error: any) {
      console.error('Error submitting payment:', error);
      throw new Error(error.response?.data?.message || 'Payment submission failed');
    }
  }
  
  static validateCardInfo(details: Partial<CardOwnerDetails>) {
    const cardOwnerValidation = validateCardOwnerDetails(details);
    return cardOwnerValidation;
  }
  
  static validateExpiry(month?: string, year?: string) {
    const cardExpiryValidation = validateCardExpiry(month, year);
    return cardExpiryValidation;
  }

  // Add the checkPaymentStatus function that was missing
  static async checkPaymentStatus(lowProfileCode: string): Promise<{success: boolean; data?: any; message?: string}> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/payment/status`, { 
        lowProfileCode 
      });
      
      return {
        success: response.data?.success || false,
        data: response.data?.data || {},
        message: response.data?.message
      };
    } catch (error: any) {
      console.error('Error checking payment status:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to check payment status'
      };
    }
  }
}
