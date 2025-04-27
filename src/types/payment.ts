
export interface Plan {
  id: number;
  code: string;
  name: string;
  price: number;
  cycle_days: number | null;
  trial_days: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: number;
  token?: string;
  token_expires_ym?: string;
  next_charge_at?: string;
  status: 'trial' | 'active' | 'suspended' | 'canceled';
  fail_count: number;
  created_at: string;
}

export interface Payment {
  id: number;
  subscription_id: string;
  tranzaction_id?: number;
  amount: number;
  response_code?: number;
  payload?: Record<string, any>;
  paid_at: string;
}

export interface PaymentLog {
  id: string;
  user_id: string;
  subscription_id?: string;
  token: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  transaction_id?: string;
  payment_data?: Record<string, any>;
}
