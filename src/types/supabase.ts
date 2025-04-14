
import { Database as OriginalDatabase, Json } from '@/integrations/supabase/types';

// Extend the original Database type to include our community tables
export interface ExtendedDatabase extends Omit<OriginalDatabase, 'public'> {
  public: {
    Tables: {
      // Keep existing tables
      app_config: OriginalDatabase['public']['Tables']['app_config'];
      contract_signatures: OriginalDatabase['public']['Tables']['contract_signatures'];
      profiles: OriginalDatabase['public']['Tables']['profiles'];
      subscriptions: OriginalDatabase['public']['Tables']['subscriptions'];
      
      // Update payment tables to match actual schema
      payment_logs: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          currency: string;
          payment_status: string;
          plan_id: string;
          transaction_id: string;
          payment_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          currency?: string;
          payment_status: string;
          plan_id: string;
          transaction_id: string;
          payment_data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          currency?: string;
          payment_status?: string;
          plan_id?: string;
          transaction_id?: string;
          payment_data?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };

      payment_errors: {
        Row: {
          id: string;
          user_id: string;
          error_code: string | null;
          error_message: string | null;
          request_data: Json | null;
          response_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          error_code?: string | null;
          error_message?: string | null;
          request_data?: Json | null;
          response_data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          error_code?: string | null;
          error_message?: string | null;
          request_data?: Json | null;
          response_data?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      
      payment_sessions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          currency: string;
          expires_at: string;
          low_profile_code: string;
          plan_id: string;
          reference: string;
          status: string;
          transaction_data: Json | null;
          transaction_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          currency?: string;
          expires_at: string;
          low_profile_code: string;
          plan_id: string;
          reference: string;
          status?: string;
          transaction_data?: Json | null;
          transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          currency?: string;
          expires_at?: string;
          low_profile_code?: string;
          plan_id?: string;
          reference?: string;
          status?: string;
          transaction_data?: Json | null;
          transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // Add new tables we created in the migration
      recurring_payments: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          token_expiry: string;
          last_4_digits: string | null;
          status: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          token_expiry: string;
          last_4_digits?: string | null;
          status?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          token_expiry?: string;
          last_4_digits?: string | null;
          status?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };

      user_payment_logs: {
        Row: {
          id: string;
          user_id: string;
          subscription_id: string | null;
          token: string;
          amount: number;
          currency: string;
          status: string;
          created_at: string | null;
          transaction_id: string | null;
          payment_data: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_id?: string | null;
          token: string;
          amount: number;
          currency?: string;
          status: string;
          created_at?: string | null;
          transaction_id?: string | null;
          payment_data?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription_id?: string | null;
          token?: string;
          amount?: number;
          currency?: string;
          status?: string;
          created_at?: string | null;
          transaction_id?: string | null;
          payment_data?: Json | null;
        };
        Relationships: [];
      };
      
      // Add our community tables
      community_reputation: OriginalDatabase['public']['Tables']['community_reputation'];
      community_badges: OriginalDatabase['public']['Tables']['community_badges'];
      user_badges: OriginalDatabase['public']['Tables']['user_badges'];
      community_posts: OriginalDatabase['public']['Tables']['community_posts'];
      community_activities: OriginalDatabase['public']['Tables']['community_activities'];
      course_progress: OriginalDatabase['public']['Tables']['course_progress'];
      user_streaks: OriginalDatabase['public']['Tables']['user_streaks'];
      community_comments: OriginalDatabase['public']['Tables']['community_comments'];
      community_tags: OriginalDatabase['public']['Tables']['community_tags'];
      post_tags: OriginalDatabase['public']['Tables']['post_tags'];
      temp_registration_data: OriginalDatabase['public']['Tables']['temp_registration_data'];
    };
    Views: OriginalDatabase['public']['Views'];
    Functions: {
      is_admin: OriginalDatabase['public']['Functions']['is_admin'];
      check_row_exists: OriginalDatabase['public']['Functions']['check_row_exists'];
      increment: OriginalDatabase['public']['Functions']['increment'];
      increment_column_value: OriginalDatabase['public']['Functions']['increment_column_value'];
      cleanup_user_payment_sessions: OriginalDatabase['public']['Functions']['cleanup_user_payment_sessions'];
      check_duplicate_payment: OriginalDatabase['public']['Functions']['check_duplicate_payment'];
    };
    Enums: OriginalDatabase['public']['Enums'];
    CompositeTypes: OriginalDatabase['public']['CompositeTypes'];
  };
}

export type Database = ExtendedDatabase;

type DefaultSchema = Database["public"];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never;
