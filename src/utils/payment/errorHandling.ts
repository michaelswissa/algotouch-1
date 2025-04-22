
import { toast } from 'sonner';

interface PaymentError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export const handlePaymentError = (error: PaymentError | Error | string) => {
  console.error('Payment error:', error);
  
  let errorMessage = 'אירעה שגיאה בעיבוד התשלום';
  
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if ('message' in error) {
    errorMessage = error.message;
  }

  // Log error details for debugging
  if (process.env.NODE_ENV === 'development') {
    console.debug('Payment error details:', {
      error,
      timestamp: new Date().toISOString(),
    });
  }

  toast.error(errorMessage);
  return errorMessage;
};

export const logPaymentEvent = (
  eventName: string, 
  data?: Record<string, any>
) => {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`Payment Event [${eventName}]:`, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
};
