
import axios from 'axios';
import { CardOwnerDetails, CardComPaymentResponse, PaymentSessionData } from '@/types/payment';
import { validateCardOwnerDetails, validateCardExpiry } from './validators';

// Define API response structure
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class CardComService {
  static async initializePayment(data: { planId: string; userId: string | null; email: string; fullName: string; operationType: string }): Promise<PaymentSessionData> {
    try {
      // Add isIframePrefill: true to the request body
      const requestData = {
        ...data,
        isIframePrefill: true
      };
      
      console.log('Initializing payment with data:', requestData);
      console.log('Calling payment endpoint:', `${API_URL}/api/payment/initiate`);
      
      // Specify the expected response structure
      const response = await axios.post<ApiResponse<PaymentSessionData>>(`${API_URL}/api/payment/initiate`, requestData);
      
      console.log('Payment initialization response:', response.data);
      
      // Check if we have the data property in the response
      if (!response.data.data || !response.data.data.lowProfileId) {
        console.error('Missing lowProfileId in response:', response.data);
        throw new Error('Initialization response missing lowProfileId');
      }
      
      // Return the data object from the response
      return response.data.data;
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
      const response = await axios.post<ApiResponse<CardComPaymentResponse>>(`${API_URL}/api/payment/process-cardcom`, data);
      return response.data.data;
    } catch (error: any) {
      console.error('Error processing CardCom response:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to process CardCom response');
    }
  }

  // Add checkPaymentStatus to this service as well to maintain compatibility
  static async checkPaymentStatus(lowProfileCode: string): Promise<{success: boolean; data?: any; message?: string}> {
    try {
      console.log('Checking payment status for lowProfileCode:', lowProfileCode);
      
      const response = await axios.post<ApiResponse<any>>(`${API_URL}/api/payment/status`, { 
        lowProfileCode 
      });
      
      console.log('Payment status response:', response.data);
      
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
