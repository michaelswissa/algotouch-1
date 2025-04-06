
import { BaseDatabase } from './base';

// Database extension for functions
export interface FunctionsDatabase {
  public: {
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
      is_admin: {
        Args: {
          user_id: string;
        };
        Returns: boolean;
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
      check_row_exists: {
        Args: {
          p_table_name: string;
          p_column_name: string;
          p_value: string;
        };
        Returns: boolean;
      };
      check_column_value: {
        Args: {
          p_table_name: string;
          p_column_name: string;
          p_row_id: string;
        };
        Returns: number;
      };
      update_column_value: {
        Args: {
          p_table_name: string;
          p_column_name: string;
          p_value: number;
          p_row_id: string;
        };
        Returns: boolean;
      };
      check_exists_direct: {
        Args: {
          p_table_name: string;
          p_column_name: string;
          p_value: string;
        };
        Returns: boolean;
      };
      execute_sql: {
        Args: {
          sql: string;
        };
        Returns: unknown;
      };
    };
  };
}
