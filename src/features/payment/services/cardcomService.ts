
import { supabase } from '@/lib/supabase-client';

interface ProcessWebhookResult {
  success: boolean;
  message: string;
  details?: any;
}

export async function processWebhookByEmail(
  email: string,
  lowProfileId?: string,
  userId?: string
): Promise<ProcessWebhookResult> {
  try {
    const { data, error } = await supabase.functions.invoke('process-webhook', {
      body: { 
        email,
        lowProfileId,
        userId
      }
    });

    if (error) {
      console.error('Error processing webhook:', error);
      return {
        success: false,
        message: 'שגיאה בעיבוד המידע מול שרת התשלומים',
        details: error
      };
    }
    
    if (!data || !data.success) {
      console.error('Processing webhook failed:', data);
      return {
        success: false,
        message: data?.message || 'שגיאה בעיבוד המידע מול שרת התשלומים',
        details: data
      };
    }
    
    return {
      success: true,
      message: 'המידע עובד בהצלחה',
      details: data
    };
  } catch (err) {
    console.error('Error invoking process-webhook function:', err);
    return {
      success: false,
      message: 'שגיאה בהתקשרות עם שרת התשלומים',
      details: err
    };
  }
}

export async function createIframeRedirect(
  amount: number, 
  successUrl: string, 
  failedUrl: string, 
  webhookUrl: string,
  returnValue: string,
  operation: string = 'ChargeAndCreateToken'
) {
  try {
    // Get the Cardcom terminal and API credentials
    const { data: configData, error: configError } = await supabase.functions.invoke(
      'get-cardcom-config',
      { body: { configType: 'iframe' } }
    );
    
    if (configError || !configData?.terminalNumber || !configData?.apiName) {
      console.error('Error getting Cardcom config:', configError || 'Missing configuration');
      throw new Error('שגיאה בקבלת נתוני חיבור לשרת התשלומים');
    }
    
    // Call iframe-redirect edge function
    const { data, error } = await supabase.functions.invoke('iframe-redirect', {
      body: {
        terminalNumber: configData.terminalNumber,
        apiName: configData.apiName,
        amount,
        successUrl,
        failedUrl,
        webhookUrl,
        returnValue,
        operation,
        productName: 'AlgoTouch Subscription',
        language: 'he'
      }
    });
    
    if (error) {
      console.error('Error creating iframe redirect:', error);
      throw new Error('שגיאה ביצירת דף תשלום');
    }
    
    if (!data || data.ResponseCode !== 0) {
      console.error('Error in iframe-redirect response:', data);
      throw new Error(data?.Description || 'שגיאה ביצירת דף תשלום');
    }
    
    return {
      lowProfileCode: data.LowProfileId,
      url: data.LowProfileUrl
    };
  } catch (err) {
    console.error('Error in createIframeRedirect:', err);
    throw err;
  }
}

export async function verifyPayment(lowProfileId: string): Promise<{
  success: boolean;
  message: string;
  paymentDetails?: any;
  tokenInfo?: any;
  source?: string;
  error?: any;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('verify-cardcom-payment', {
      body: { lowProfileId }
    });
    
    if (error) {
      console.error('Error verifying payment:', error);
      return {
        success: false,
        message: 'שגיאה באימות התשלום',
        error
      };
    }
    
    return {
      ...data,
      source: data?.source || 'api_verification'
    };
  } catch (err) {
    console.error('Error invoking verify-payment function:', err);
    return {
      success: false,
      message: 'שגיאה בהתקשרות עם שרת התשלומים',
      error: err
    };
  }
}

// Add the missing createTokenizationUrl function
export async function createTokenizationUrl({
  terminalNumber,
  apiName,
  amount,
  successUrl,
  errorUrl,
  webhookUrl,
  productName = 'AlgoTouch Subscription',
  returnValue,
  language = 'he',
  operation = 'ChargeAndCreateToken',
  fullName,
  email
}: {
  terminalNumber: number;
  apiName: string;
  amount: number;
  successUrl: string;
  errorUrl: string;
  webhookUrl: string;
  productName?: string;
  returnValue: string;
  language?: string;
  operation?: string;
  fullName?: string;
  email?: string;
}) {
  try {
    // Call iframe-redirect edge function
    const { data, error } = await supabase.functions.invoke('iframe-redirect', {
      body: {
        terminalNumber,
        apiName,
        amount,
        successUrl,
        failedUrl: errorUrl,
        webhookUrl,
        returnValue,
        operation,
        productName,
        language,
        customerName: fullName,
        customerEmail: email
      }
    });
    
    if (error) {
      console.error('Error creating tokenization URL:', error);
      return {
        success: false,
        error: 'שגיאה ביצירת דף תשלום'
      };
    }
    
    if (!data || data.ResponseCode !== 0) {
      console.error('Error in iframe-redirect response:', data);
      return {
        success: false,
        error: data?.Description || 'שגיאה ביצירת דף תשלום'
      };
    }
    
    return {
      success: true,
      url: data.LowProfileUrl,
      lowProfileId: data.LowProfileId
    };
  } catch (err) {
    console.error('Error in createTokenizationUrl:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'שגיאה ביצירת דף תשלום'
    };
  }
}

// Add the missing logPaymentError function
export const logPaymentError = async (
  error: any, 
  userId?: string, 
  context: string = 'payment_general',
  additionalData?: any
) => {
  try {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Log to console
    console.error(`[${context}] Payment error:`, errorMessage, {
      userId,
      ...(additionalData || {})
    });
    
    // Log to the database
    await supabase.from('system_logs').insert({
      function_name: context,
      level: 'error',
      message: errorMessage,
      details: {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        userId: userId || 'anonymous',
        context,
        timestamp: new Date().toISOString(),
        ...(additionalData || {})
      }
    });
  } catch (logError) {
    // Just log to console if logging to the database fails
    console.error('Failed to log payment error:', logError);
  }
};
