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
      payment_history: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          payment_date: string | null
          payment_method: Json | null
          status: string
          subscription_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          id?: string
          payment_date?: string | null
          payment_method?: Json | null
          status: string
          subscription_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          payment_date?: string | null
          payment_method?: Json | null
          status?: string
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_tokens: {
        Row: {
          card_brand: string | null
          card_last_four: string | null
          created_at: string
          id: string
          is_active: boolean | null
          token: string
          token_expiry: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          token: string
          token_expiry: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_brand?: string | null
          card_last_four?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          token?: string
          token_expiry?: string
          updated_at?: string
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
        Relationships: [
          {
            foreignKeyName: "subscriptions_payment_token_id_fkey"
            columns: ["payment_token_id"]
            isOneToOne: false
            referencedRelation: "payment_tokens"
            referencedColumns: ["id"]
          },
        ]
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
      is_admin: {
        Args: {
          user_id: string
        }
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
