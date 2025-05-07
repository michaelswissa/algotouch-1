
import { supabase } from '@/integrations/supabase/client';

// Define specific table names as a literal string union type to avoid excessive type instantiation
export type TableNames = 
  | 'app_config'
  | 'community_activities'
  | 'community_badges'
  | 'community_comments'
  | 'community_posts'
  | 'community_reputation'
  | 'community_tags'
  | 'contract_signatures'
  | 'course_progress'
  | 'payment_history'
  | 'payment_tokens'
  | 'post_tags'
  | 'profiles'
  | 'subscriptions'
  | 'temp_registration_data'
  | 'user_badges'
  | 'user_streaks';

/**
 * Helper function to increment a column value in a specified table
 * Using raw RPC call to avoid type instantiation issues
 */
export async function incrementColumnValue(
  rowId: string,
  tableName: TableNames,
  columnName: string,
  incrementBy: number = 1
): Promise<boolean> {
  try {
    // Use RPC to execute an increment operation instead of the query builder
    const { data, error } = await supabase.rpc('increment_column_value', {
      p_row_id: rowId,
      p_table_name: tableName,
      p_column_name: columnName,
      p_increment_by: incrementBy
    });
    
    if (error) {
      console.error(`Error incrementing ${columnName} in ${tableName}:`, error);
      
      // Fallback method if RPC fails - avoid the query builder completely
      // First get current value directly with a simple scalar query
      try {
        // Use RPC to get the current value with a simple query
        const { data: currentData, error: valueError } = await supabase.rpc('check_column_value', {
          p_table_name: tableName,
          p_column_name: columnName,
          p_row_id: rowId
        });
        
        if (valueError) {
          console.error(`Failed to get current value for ${tableName}.${columnName}:`, valueError);
          return false;
        }
        
        if (currentData === null || typeof currentData !== 'number') {
          console.error(`Column ${columnName} not found or is not a number`);
          return false;
        }
        
        // Calculate new value
        const newValue = currentData + incrementBy;
        
        // Use RPC to update the value
        const { error: updateError } = await supabase.rpc('update_column_value', {
          p_table_name: tableName,
          p_column_name: columnName,
          p_value: newValue,
          p_row_id: rowId
        });
        
        if (updateError) {
          console.error(`Failed to update ${tableName}.${columnName}:`, updateError);
          return false;
        }
        
        return true;
      } catch (fallbackError) {
        console.error(`Fallback error for ${tableName}.${columnName}:`, fallbackError);
        return false;
      }
    }
    
    return data === true;
  } catch (error) {
    console.error(`Exception in incrementColumnValue for ${tableName}.${columnName}:`, error);
    return false;
  }
}

/**
 * Helper function to check if a row exists in a table
 * Using direct count query to avoid type instantiation issues
 */
export async function rowExists(tableName: TableNames, column: string, value: string): Promise<boolean> {
  try {
    // Use a raw count query to avoid excessive type instantiation
    const { data, error } = await supabase.rpc('check_row_exists', {
      p_table_name: tableName,
      p_column_name: column,
      p_value: value
    });
    
    if (error) {
      console.error(`Error checking if row exists in ${tableName} (RPC):`, error);
      
      // Fallback to direct count query if RPC fails
      console.warn('RPC failed, using fallback count query');
      
      try {
        // Execute a direct SQL count query via another RPC
        const { data: exists, error: countError } = await supabase.rpc('check_exists_direct', {
          p_table_name: tableName,
          p_column_name: column,
          p_value: value
        });
        
        if (countError) {
          console.error(`Fallback: Error checking if row exists:`, countError);
          return false;
        }
        
        return exists === true;
      } catch (fallbackError) {
        console.error(`Fallback exception for ${tableName}.${column}:`, fallbackError);
        return false;
      }
    }
    
    return data === true;
  } catch (error) {
    console.error(`Error in rowExists for ${tableName}.${column}:`, error);
    return false;
  }
}
