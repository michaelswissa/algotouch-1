
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
    };
  };
}
