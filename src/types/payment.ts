
export type PlanType = 'monthly' | 'annual' | 'vip';

export type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired';

export interface Plan {
  id: PlanType;
  name: string;
  price: number;
  displayPrice: string;
  description: string;
  cycleDays: number;
  trialDays: number;
}

export interface PaymentSession {
  id: string;
  userId: string;
  planId: PlanType;
  amount: number;
  lowProfileCode: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  operation: 'CreateTokenOnly' | 'ChargeAndCreateToken' | 'ChargeOnly';
  expiresAt: string;
}
