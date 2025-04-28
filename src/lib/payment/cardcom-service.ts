// Fix imports to use the new path
import axios from 'axios';
import { CardOwnerDetails, CardComPaymentResponse, PaymentSessionData } from '@/types/payment';
import { validateCardOwnerDetails, validateCardExpiry } from './validators';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class CardComService {
  static async initializePayment(data: { planId: string; userId: string | null; email: string; fullName: string; operationType: string }): Promise<PaymentSessionData> {
    try {
      const response = await axios.post<PaymentSessionData>(`${API_URL}/api/payment/initiate`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error initializing payment:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to initialize payment');
    }
  }

  static async submitPayment(data: { lowProfileCode: string; terminalNumber: string; operationType: string; cardOwnerDetails: CardOwnerDetails }): Promise<boolean> {
    try {
      // No direct API call here, the transaction is handled via iframe
      // The server-side logic is triggered by the polling mechanism
      return true;
    } catch (error: any) {
      console.error('Error submitting payment:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to submit payment');
    }
  }
  
  static validateCardInfo(details: Partial<CardOwnerDetails>) {
    return validateCardOwnerDetails(details);
  }
  
  static validateExpiry(month?: string, year?: string) {
    return validateCardExpiry(month, year);
  }

  static async processCardComResponse(data: any): Promise<CardComPaymentResponse> {
    try {
      const response = await axios.post<CardComPaymentResponse>(`${API_URL}/api/payment/process-cardcom`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error processing CardCom response:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to process CardCom response');
    }
  }
}
