
import axios from 'axios';
import { CardOwnerDetails, CardComPaymentResponse, PaymentStatusType, PaymentStatus, PaymentSessionData } from '@/types/payment';
import { validateCardOwnerDetails, validateCardExpiry } from '@/lib/payment/validators';

// Define API response structure
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// Use the Supabase URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const PAYMENT_ENDPOINT = `${API_BASE_URL}/api/payment/initiate`;
const STATUS_ENDPOINT = `${API_BASE_URL}/api/payment/status`;

export class CardComService {
  static async initializePayment(data: { 
    planId: string; 
    userId: string | null; 
    email: string; 
    fullName: string; 
    operationType: string 
  }): Promise<PaymentSessionData> {
    try {
      // Add isIframePrefill: true to the request body to get iframe parameters
      const requestData = {
        ...data,
        isIframePrefill: true
      };
      
      console.log('Initializing payment with data:', requestData);
      console.log('Calling payment endpoint:', PAYMENT_ENDPOINT);

      // Specify the expected response structure
      const response = await axios.post<ApiResponse<PaymentSessionData>>(PAYMENT_ENDPOINT, requestData);
      
      console.log('Payment initialization response:', response.data);

      // Check if we have the data property in the response
      if (!response.data.data || !response.data.data.lowProfileId) {
        console.error('Missing lowProfileId in response:', response.data);
        throw new Error('Initialization response missing lowProfileId');
      }

      // Return the data object from the response
      return response.data.data;
    } catch (error: any) {
      console.error('Error initializing payment:', error);
      // Log more detailed error info if available
      if (axios.isAxiosError(error)) {
        console.error('API error details:', error.response?.data, error.response?.status);
      }
      throw new Error(error.response?.data?.message || 'Failed to initialize payment');
    }
  }

  static async submitPayment(data: { lowProfileCode: string; terminalNumber: string; operationType: string; cardOwnerDetails: CardOwnerDetails }): Promise<boolean> {
    try {
      // No direct API call to CardCom here; the transaction is initiated via the iframe
      // This method might be used for post-processing or status updates in the future
      console.log('Payment submission initiated for iframe flow:', { 
        lowProfileCode: data.lowProfileCode,
        operationType: data.operationType
      });
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
      console.log('Checking payment status for lowProfileCode:', lowProfileCode);
      
      const response = await axios.post<ApiResponse<any>>(STATUS_ENDPOINT, { 
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
      if (axios.isAxiosError(error)) {
        console.error('API error details:', error.response?.data, error.response?.status);
      }
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to check payment status'
      };
    }
  }
}
