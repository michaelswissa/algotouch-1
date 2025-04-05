import { Database as OriginalDatabase } from '@/integrations/supabase/types';

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
      payment_tokens: OriginalDatabase['public']['Tables']['payment_tokens'];
      
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
