
import { BaseDatabase } from './base';

// Database extension for user profiles
export interface ProfilesDatabase {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          street: string | null;
          city: string | null;
          postal_code: string | null;
          country: string | null;
          birth_date: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          street?: string | null;
          city?: string | null;
          postal_code?: string | null;
          country?: string | null;
          birth_date?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          street?: string | null;
          city?: string | null;
          postal_code?: string | null;
          country?: string | null;
          birth_date?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      app_config: {
        Row: {
          id: string;
          key_name: string;
          key_value: string;
          user_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          key_name: string;
          key_value: string;
          user_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          key_name?: string;
          key_value?: string;
          user_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
  };
}
