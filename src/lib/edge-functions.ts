
import { supabase } from '@/lib/supabase';

// Error class for edge function errors
export class EdgeFunctionError extends Error {
  public statusCode: number;
  public originalError: any;
  
  constructor(message: string, statusCode: number = 500, originalError?: any) {
    super(message);
    this.name = 'EdgeFunctionError';
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

// Type for edge function response
export interface EdgeFunctionResponse<T> {
  data: T | null;
  error: EdgeFunctionError | null;
}

// Generic function to call edge functions with proper error handling
export async function callEdgeFunction<T = any, P = any>(
  functionName: string,
  payload?: P,
  options?: {
    retries?: number;
    throwError?: boolean;
  }
): Promise<EdgeFunctionResponse<T>> {
  const { retries = 0, throwError = false } = options || {};
  let attempts = 0;
  
  const executeRequest = async (): Promise<EdgeFunctionResponse<T>> => {
    try {
      attempts++;
      console.log(`Calling edge function: ${functionName} (attempt ${attempts}/${retries + 1})`);
      
      const { data, error } = await supabase.functions.invoke<T>(
        functionName,
        {
          body: payload
        }
      );
      
      if (error) {
        throw new EdgeFunctionError(
          error.message || `Edge function ${functionName} failed`,
          error.status || 500,
          error
        );
      }
      
      return { data, error: null };
    } catch (error: any) {
      console.error(`Error calling edge function ${functionName}:`, error);
      
      // Retry logic
      if (attempts <= retries) {
        console.log(`Retrying edge function ${functionName}... (${attempts}/${retries})`);
        return executeRequest();
      }
      
      const edgeFunctionError = error instanceof EdgeFunctionError
        ? error
        : new EdgeFunctionError(
            error.message || `Failed to call edge function: ${functionName}`,
            error.status || 500,
            error
          );
      
      if (throwError) {
        throw edgeFunctionError;
      }
      
      return { data: null, error: edgeFunctionError };
    }
  };
  
  return executeRequest();
}

// Specific edge function interfaces and callers
export interface ProcessPaymentResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export async function processPayment(paymentData: any): Promise<EdgeFunctionResponse<ProcessPaymentResponse>> {
  return callEdgeFunction<ProcessPaymentResponse>('process-payment-data', { paymentData });
}

export interface StockDataItem {
  symbol: string;
  currentPrice: number;
  change: string;
  changePercent: string;
}

export async function fetchStockData(): Promise<EdgeFunctionResponse<StockDataItem[]>> {
  return callEdgeFunction<StockDataItem[]>('stock-data');
}
