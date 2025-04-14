
import { Database as OriginalDatabase, Json } from '@/integrations/supabase/types';

// Extend the original Database type to include our community tables
export interface ExtendedDatabase extends OriginalDatabase {
  public: {
    Tables: {
      // Keep existing tables
      app_config: OriginalDatabase['public']['Tables']['app_config'];
      contract_signatures: OriginalDatabase['public']['Tables']['contract_signatures'];
      payment_history: OriginalDatabase['public']['Tables']['payment_history'];
      profiles: OriginalDatabase['public']['Tables']['profiles'];
      subscriptions: OriginalDatabase['public']['Tables']['subscriptions'];
      
      // Add our new community tables
      community_reputation: {
        Row: {
          id: string;
          user_id: string;
          points: number;
          level: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          points?: number;
          level?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          points?: number;
          level?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      community_badges: {
        Row: {
          id: string;
          name: string;
          description: string;
          icon: string;
          points_required: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          icon: string;
          points_required?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          icon?: string;
          points_required?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          earned_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          badge_id?: string;
          earned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "community_badges";
            referencedColumns: ["id"];
          }
        ];
      };
      community_posts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          likes: number;
          comments: number;
          created_at: string;
          updated_at: string;
          media_urls: string[] | null; // Added missing media_urls property
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content: string;
          likes?: number;
          comments?: number;
          created_at?: string;
          updated_at?: string;
          media_urls?: string[] | null; // Added to Insert
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          likes?: number;
          comments?: number;
          created_at?: string;
          updated_at?: string;
          media_urls?: string[] | null; // Added to Update
        };
        Relationships: [];
      };
      community_activities: {
        Row: {
          id: string;
          user_id: string;
          activity_type: string;
          points_earned: number;
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_type: string;
          points_earned?: number;
          reference_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          activity_type?: string;
          points_earned?: number;
          reference_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      course_progress: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          lessons_watched: string[] | null;
          modules_completed: string[] | null;
          is_completed: boolean | null;
          last_watched: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          lessons_watched?: string[] | null;
          modules_completed?: string[] | null;
          is_completed?: boolean | null;
          last_watched?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          lessons_watched?: string[] | null;
          modules_completed?: string[] | null;
          is_completed?: boolean | null;
          last_watched?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_streaks: {
        Row: {
          id: string;
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_activity: string;
          streak_start_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_activity?: string;
          streak_start_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          current_streak?: number;
          longest_streak?: number;
          last_activity?: string;
          streak_start_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      // Update community_comments with the correct Relationships
      community_comments: {
        Row: {
          id: string;
          content: string;
          user_id: string;
          post_id: string;
          parent_comment_id: string | null;
          likes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          user_id: string;
          post_id: string;
          parent_comment_id?: string | null;
          likes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          content?: string;
          user_id?: string;
          post_id?: string;
          parent_comment_id?: string | null;
          likes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "community_comments_parent_comment_id_fkey";
            columns: ["parent_comment_id"];
            isOneToOne: false;
            referencedRelation: "community_comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "community_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          }
        ];
      };
      community_tags: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
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
          error_details: Json | null;
          payment_details: Json | null;
          context: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          error_code?: string | null;
          error_message?: string | null;
          error_details?: Json | null;
          payment_details?: Json | null;
          context?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          error_code?: string | null;
          error_message?: string | null;
          error_details?: Json | null;
          payment_details?: Json | null;
          context?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      payment_sessions: {
        Row: {
          id: string;
          user_id: string | null;
          email: string | null;
          plan_id: string;
          payment_details: Json | null;
          expires_at: string;
          created_at: string | null;
        };
        Insert: {
          id: string;
          user_id?: string | null;
          email?: string | null;
          plan_id: string;
          payment_details?: Json | null;
          expires_at: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email?: string | null;
          plan_id?: string;
          payment_details?: Json | null;
          expires_at?: string;
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
      post_tags: {
        Row: {
          post_id: string;
          tag_id: string;
        };
        Insert: {
          post_id: string;
          tag_id: string;
        };
        Update: {
          post_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "community_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "community_tags";
            referencedColumns: ["id"];
          }
        ];
      };
      temp_registration_data: {
        Row: {
          id: string;
          registration_data: Json;
          expires_at: string;
          created_at: string;
          used: boolean;
        };
        Insert: {
          id?: string;
          registration_data: Json;
          expires_at: string;
          created_at?: string;
          used?: boolean;
        };
        Update: {
          id?: string;
          registration_data?: Json;
          expires_at?: string;
          created_at?: string;
          used?: boolean;
        };
        Relationships: [];
      };
      user_payment_logs: {
        Row: {
          id: string;
          user_id: string | null;
          token: string;
          amount: number;
          status: string;
          approval_code: string | null;
          transaction_details: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          token: string;
          amount: number;
          status: string;
          approval_code?: string | null;
          transaction_details?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          token?: string;
          amount?: number;
          status?: string;
          approval_code?: string | null;
          transaction_details?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      // Add the missing payment_logs table definition
      payment_logs: {
        Row: {
          id: string;
          user_id: string | null;
          lowprofile_id: string;
          plan_id: string | null;
          transaction_id: string | null;
          payment_data: Json | null;
          status: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          lowprofile_id: string;
          plan_id?: string | null;
          transaction_id?: string | null;
          payment_data?: Json | null;
          status: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          lowprofile_id?: string;
          plan_id?: string | null;
          transaction_id?: string | null;
          payment_data?: Json | null;
          status?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: OriginalDatabase['public']['Views'];
    Functions: {
      increment_user_points: {
        Args: {
          user_id_param: string;
          points_to_add: number;
        };
        Returns: {
          points: number;
          level: number;
        };
      };
      is_admin: OriginalDatabase['public']['Functions']['is_admin'];
      // Add the missing functions from the original database
      check_row_exists: {
        Args: {
          p_table_name: string;
          p_column_name: string;
          p_value: string;
        };
        Returns: boolean;
      };
      increment: {
        Args: {
          row_id: string;
          table_name: string;
          column_name: string;
        };
        Returns: undefined;
      };
      increment_column_value: {
        Args: {
          p_row_id: string;
          p_table_name: string;
          p_column_name: string;
          p_increment_by?: number;
        };
        Returns: boolean;
      };
      // Add our new functions
      cleanup_user_payment_sessions: {
        Args: {
          user_id_param: string;
        };
        Returns: undefined;
      };
      check_duplicate_payment: {
        Args: {
          low_profile_id: string;
        };
        Returns: boolean;
      };
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
