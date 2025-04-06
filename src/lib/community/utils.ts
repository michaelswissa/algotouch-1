
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
      
      // Fallback method if RPC fails - use raw SQL via direct parameters
      // This avoids the deep type instantiation issues with the query builder
      console.warn('RPC failed, using direct update query');
      
      // First get current value with simple parameters to avoid complex type inference
      const currentValue = await supabase.from(tableName)
        .select(columnName)
        .eq('id', rowId)
        .limit(1)
        .single();
      
      if (currentValue.error) {
        console.error(`Fallback: Error fetching ${columnName} from ${tableName}:`, currentValue.error);
        return false;
      }
      
      // If value not found or not a number, return false
      if (!currentValue.data || typeof currentValue.data[columnName] !== 'number') {
        console.error(`Fallback: Column ${columnName} not found or is not a number in table ${tableName}`);
        return false;
      }
      
      // Calculate new value
      const newValue = currentValue.data[columnName] + incrementBy;
      
      // Update with simple parameters, avoiding complex types
      const updateResult = await supabase.from(tableName)
        .update({ [columnName]: newValue })
        .eq('id', rowId);
      
      if (updateResult.error) {
        console.error(`Fallback: Error updating ${columnName} in ${tableName}:`, updateResult.error);
        return false;
      }
      
      return true;
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
      
      // Use a direct count query with simple options to avoid complex type inference
      const countResult = await supabase
        .from(tableName)
        .select('id', { count: 'exact', head: true })
        .eq(column, value);
      
      if (countResult.error) {
        console.error(`Fallback: Error checking if row exists in ${tableName}:`, countResult.error);
        return false;
      }
      
      return (countResult.count || 0) > 0;
    }
    
    return data === true;
  } catch (error) {
    console.error(`Error in rowExists for ${tableName}.${column}:`, error);
    return false;
  }
}
