export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_config: {
        Row: {
          created_at: string | null
          id: string
          key_name: string
          key_value: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_name: string
          key_value: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key_name?: string
          key_value?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      community_activities: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          points_earned: number
          reference_id: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          points_earned?: number
          reference_id?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          points_earned?: number
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      community_badges: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          points_required: number
        }
        Insert: {
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          points_required?: number
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          points_required?: number
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes: number
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes?: number
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes?: number
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          comments: number
          content: string
          created_at: string
          id: string
          likes: number
          media_urls: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comments?: number
          content: string
          created_at?: string
          id?: string
          likes?: number
          media_urls?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comments?: number
          content?: string
          created_at?: string
          id?: string
          likes?: number
          media_urls?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_reputation: {
        Row: {
          created_at: string
          id: string
          level: number
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      community_tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      contract_signatures: {
        Row: {
          address: string | null
          agreed_to_privacy: boolean
          agreed_to_terms: boolean
          browser_info: Json | null
          contract_html: string | null
          contract_signed_at: string
          contract_version: string
          created_at: string
          email: string
          full_name: string
          id: string
          id_number: string | null
          ip_address: string | null
          pdf_url: string | null
          phone: string | null
          plan_id: string
          signature: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          agreed_to_privacy?: boolean
          agreed_to_terms?: boolean
          browser_info?: Json | null
          contract_html?: string | null
          contract_signed_at?: string
          contract_version: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          id_number?: string | null
          ip_address?: string | null
          pdf_url?: string | null
          phone?: string | null
          plan_id: string
          signature: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          agreed_to_privacy?: boolean
          agreed_to_terms?: boolean
          browser_info?: Json | null
          contract_html?: string | null
          contract_signed_at?: string
          contract_version?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          id_number?: string | null
          ip_address?: string | null
          pdf_url?: string | null
          phone?: string | null
          plan_id?: string
          signature?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      course_progress: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          is_completed: boolean | null
          last_watched: string | null
          lessons_watched: string[] | null
          modules_completed: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_watched?: string | null
          lessons_watched?: string[] | null
          modules_completed?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_watched?: string | null
          lessons_watched?: string[] | null
          modules_completed?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "community_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          postal_code: string | null
          street: string | null
          updated_at: string | null
        }
        Insert: {
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Update: {
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          contract_signed: boolean | null
          contract_signed_at: string | null
          contract_signed_location: string | null
          created_at: string | null
          current_period_ends_at: string | null
          id: string
          next_charge_date: string | null
          payment_method: Json | null
          payment_token_id: string | null
          plan_type: string
          status: string
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          contract_signed?: boolean | null
          contract_signed_at?: string | null
          contract_signed_location?: string | null
          created_at?: string | null
          current_period_ends_at?: string | null
          id?: string
          next_charge_date?: string | null
          payment_method?: Json | null
          payment_token_id?: string | null
          plan_type?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          contract_signed?: boolean | null
          contract_signed_at?: string | null
          contract_signed_location?: string | null
          created_at?: string | null
          current_period_ends_at?: string | null
          id?: string
          next_charge_date?: string | null
          payment_method?: Json | null
          payment_token_id?: string | null
          plan_type?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      temp_registration_data: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          registration_data: Json
          used: boolean
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          registration_data: Json
          used?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          registration_data?: Json
          used?: boolean
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "community_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_activity: string
          longest_streak: number
          streak_start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity?: string
          longest_streak?: number
          streak_start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_activity?: string
          longest_streak?: number
          streak_start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_duplicate_payment: {
        Args: { low_profile_id: string }
        Returns: boolean
      }
      check_row_exists: {
        Args: { p_table_name: string; p_column_name: string; p_value: string }
        Returns: boolean
      }
      cleanup_user_payment_sessions: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      increment: {
        Args: { row_id: string; table_name: string; column_name: string }
        Returns: undefined
      }
      increment_column_value: {
        Args: {
          p_row_id: string
          p_table_name: string
          p_column_name: string
          p_increment_by?: number
        }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
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

export type TablesUpdate<
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
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
