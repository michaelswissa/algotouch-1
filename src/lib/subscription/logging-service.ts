
/**
 * Centralized logging service for subscription flow
 */
const SubscriptionLogger = {
  logStepChange: (from: number, to: number) => {
    console.log(`Step change: ${from} -> ${to}`);
  },

  logPlanSelection: (planId: string) => {
    console.log('Plan selected:', planId);
  },

  logError: (error: unknown, context: string) => {
    console.error(`Error in ${context}:`, error);
  },

  logContractSigned: (data: { planId: string; email?: string }) => {
    console.log('Contract signed:', data);
  },

  logPaymentComplete: (data: { planId: string; success: boolean }) => {
    console.log('Payment completed:', data);
  }
};

export default SubscriptionLogger;
