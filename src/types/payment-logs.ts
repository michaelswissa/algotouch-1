
import { Json } from '@/integrations/supabase/types';

// Interface representing payment logs as stored in the database
export interface PaymentLogDB {
  id: string;
  user_id: string;
  transaction_id: string;
  amount: number;
  currency: string;
  payment_status: string;
  payment_data: Json | null;
  plan_id: string;
  created_at: string;
}

// Interface for displaying payment logs in the UI
export interface PaymentLog {
  id: string;
  level: string;
  message: string;
  context: string;
  payment_data: Json;
  user_id: string;
  transaction_id: string;
  created_at: string;
  session_id?: string;
  source?: string;
}

// Interface for webhook payment data to avoid deep type recursion
export interface PaymentWebhookRow {
  id: string;
  payload: Json;
  processed: boolean | null;
  created_at: string | null;
  processed_at?: string | null;
  processing_attempts?: number | null;
  processing_result?: Json | null;
  webhook_type: string;
}
