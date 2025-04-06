
import { BaseDatabase } from './base';

// Database extension for payment and subscription features
export interface PaymentsDatabase {
  public: {
    Tables: {
      payment_history: {
        Row: {
          id: string;
          user_id: string;
          subscription_id: string;
          amount: number;
          status: string;
          currency: string;
          payment_method: any | null;
          payment_date: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_id: string;
          amount: number;
          status: string;
          currency?: string;
          payment_method?: any | null;
          payment_date?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription_id?: string;
          amount?: number;
          status?: string;
          currency?: string;
          payment_method?: any | null;
          payment_date?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      payment_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          token_expiry: string;
          card_brand: string | null;
          card_last_four: string | null;
          is_active: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          token_expiry: string;
          card_brand?: string | null;
          card_last_four?: string | null;
          is_active?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          token_expiry?: string;
          card_brand?: string | null;
          card_last_four?: string | null;
          is_active?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_type: string;
          status: string;
          trial_ends_at: string | null;
          current_period_ends_at: string | null;
          cancelled_at: string | null;
          payment_method: any | null;
          payment_token_id: string | null;
          contract_signed: boolean | null;
          contract_signed_at: string | null;
          contract_signed_location: string | null;
          next_charge_date: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_type?: string;
          status?: string;
          trial_ends_at?: string | null;
          current_period_ends_at?: string | null;
          cancelled_at?: string | null;
          payment_method?: any | null;
          payment_token_id?: string | null;
          contract_signed?: boolean | null;
          contract_signed_at?: string | null;
          contract_signed_location?: string | null;
          next_charge_date?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_type?: string;
          status?: string;
          trial_ends_at?: string | null;
          current_period_ends_at?: string | null;
          cancelled_at?: string | null;
          payment_method?: any | null;
          payment_token_id?: string | null;
          contract_signed?: boolean | null;
          contract_signed_at?: string | null;
          contract_signed_location?: string | null;
          next_charge_date?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      contract_signatures: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          full_name: string;
          email: string;
          phone: string | null;
          id_number: string | null;
          address: string | null;
          signature: string;
          agreed_to_terms: boolean;
          agreed_to_privacy: boolean;
          contract_version: string;
          contract_signed_at: string;
          contract_html: string | null;
          pdf_url: string | null;
          browser_info: any | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          id_number?: string | null;
          address?: string | null;
          signature: string;
          agreed_to_terms?: boolean;
          agreed_to_privacy?: boolean;
          contract_version: string;
          contract_signed_at?: string;
          contract_html?: string | null;
          pdf_url?: string | null;
          browser_info?: any | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          id_number?: string | null;
          address?: string | null;
          signature?: string;
          agreed_to_terms?: boolean;
          agreed_to_privacy?: boolean;
          contract_version?: string;
          contract_signed_at?: string;
          contract_html?: string | null;
          pdf_url?: string | null;
          browser_info?: any | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      temp_registration_data: {
        Row: {
          id: string;
          registration_data: any;
          expires_at: string;
          used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          registration_data: any;
          expires_at: string;
          used?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          registration_data?: any;
          expires_at?: string;
          used?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
  };
}
