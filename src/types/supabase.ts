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
      // Add user_streaks table definition
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
      // Add missing tables that were mentioned in the error
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
        Relationships: [];
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
        Relationships: [];
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
    };
    Enums: OriginalDatabase['public']['Enums'];
    CompositeTypes: OriginalDatabase['public']['CompositeTypes'];
  };
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never
