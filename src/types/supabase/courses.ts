
import { BaseDatabase } from './base';

// Database extension for course features
export interface CourseDatabase {
  public: {
    Tables: {
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
    };
  };
}
