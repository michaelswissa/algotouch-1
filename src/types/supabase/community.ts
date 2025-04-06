
import { BaseDatabase } from './base';

// Database extension for community features
export interface CommunityDatabase {
  public: {
    Tables: {
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
    };
  };
}
