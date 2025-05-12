
import { PaymentLogger } from '../logging/paymentLogger';
import { CardcomPayload, CardcomWebhookPayload } from '@/types/payment';

export interface PaymentMonitoringOptions {
  enableDetailedLogs?: boolean;
  trackResponseTimes?: boolean;
  userId?: string;
}

export class PaymentMonitor {
  private static options: PaymentMonitoringOptions = {
    enableDetailedLogs: true,
    trackResponseTimes: true
  };

  /**
   * Configure global monitoring options
   */
  static configure(options: PaymentMonitoringOptions): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Start tracking a payment request
   */
  static startTracking(requestId: string, userId?: string): { endTracking: () => void } {
    const startTime = Date.now();
    const context = `request:${requestId}`;
    
    PaymentLogger.info(
      'Payment request initiated', 
      context,
      { requestId }, 
      userId
    );
    
    return {
      endTracking: () => {
        if (this.options.trackResponseTimes) {
          const duration = Date.now() - startTime;
          PaymentLogger.info(
            'Payment request completed', 
            context,
            { requestId, durationMs: duration }, 
            userId
          );
        }
      }
    };
  }

  /**
   * Log payment verification attempt
   */
  static logVerificationAttempt(
    lowProfileId: string, 
    source: string,
    userId?: string
  ): void {
    PaymentLogger.info(
      'Verifying payment', 
      'payment-verification',
      { lowProfileId, source }, 
      userId
    );
  }

  /**
   * Log successful payment verification
   */
  static logVerificationSuccess(
    lowProfileId: string, 
    source: string,
    responseData: any,
    userId?: string
  ): void {
    PaymentLogger.success(
      'Payment verified successfully', 
      'payment-verification',
      { 
        lowProfileId, 
        source,
        transactionId: responseData?.TranzactionId || responseData?.transactionId,
        amount: responseData?.Amount || responseData?.amount,
      }, 
      userId,
      responseData?.TranzactionId?.toString() || responseData?.transactionId
    );
  }

  /**
   * Log failed payment verification
   */
  static logVerificationFailure(
    lowProfileId: string, 
    source: string,
    error: any,
    userId?: string
  ): void {
    PaymentLogger.error(
      'Payment verification failed', 
      'payment-verification',
      { 
        lowProfileId, 
        source,
        error: error?.message || error,
        errorCode: error?.code,
        errorDetails: error?.details
      }, 
      userId
    );
  }

  /**
   * Log webhook received
   */
  static logWebhookReceived(
    payload: CardcomWebhookPayload,
    webhookId?: string
  ): void {
    const userId = payload.ReturnValue;
    
    PaymentLogger.info(
      'Payment webhook received', 
      'webhook',
      { 
        lowProfileId: payload.LowProfileId,
        operation: payload.Operation,
        responseCode: payload.ResponseCode,
        webhookId
      }, 
      userId,
      payload.TranzactionId?.toString()
    );
  }

  /**
   * Log webhook processing result
   */
  static logWebhookProcessed(
    payload: CardcomWebhookPayload,
    success: boolean,
    webhookId?: string
  ): void {
    const userId = payload.ReturnValue;
    const logMethod = success ? PaymentLogger.success : PaymentLogger.error;
    
    logMethod(
      success ? 'Webhook processed successfully' : 'Webhook processing failed', 
      'webhook',
      { 
        lowProfileId: payload.LowProfileId,
        operation: payload.Operation,
        responseCode: payload.ResponseCode,
        webhookId
      }, 
      userId,
      payload.TranzactionId?.toString()
    );
  }

  /**
   * Log payment session creation
   */
  static logPaymentSessionCreated(
    planId: string,
    sessionId: string,
    userId?: string
  ): void {
    PaymentLogger.info(
      'Payment session created', 
      'payment-session',
      { planId, sessionId }, 
      userId
    );
  }
}
