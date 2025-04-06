
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
    const { error } = await supabase.rpc('increment_column_value', {
      p_row_id: rowId,
      p_table_name: tableName,
      p_column_name: columnName,
      p_increment_by: incrementBy
    });
    
    if (error) {
      console.error(`Error incrementing ${columnName} in ${tableName}:`, error);
      
      // Fallback method if RPC fails
      console.warn('RPC failed, using fallback method');
      
      // Get current value first using raw SQL
      const { data: currentValueResult, error: fetchError } = await supabase.from(tableName)
        .select(columnName)
        .eq('id', rowId)
        .single();
      
      if (fetchError) {
        console.error(`Fallback: Error fetching ${columnName} from ${tableName}:`, fetchError);
        return false;
      }
      
      if (!currentValueResult || typeof currentValueResult[columnName] !== 'number') {
        console.error(`Fallback: Column ${columnName} not found or is not a number in table ${tableName}`);
        return false;
      }
      
      // Update with incremented value
      const newValue = currentValueResult[columnName] + incrementBy;
      const { error: updateError } = await supabase.from(tableName)
        .update({ [columnName]: newValue })
        .eq('id', rowId);
      
      if (updateError) {
        console.error(`Fallback: Error updating ${columnName} in ${tableName}:`, updateError);
        return false;
      }
      
      return true;
    }
    
    return true;
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
      
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .eq(column, value);
      
      if (countError) {
        console.error(`Fallback: Error checking if row exists in ${tableName}:`, countError);
        return false;
      }
      
      return count !== null && count > 0;
    }
    
    return data === true;
  } catch (error) {
    console.error(`Error in rowExists for ${tableName}.${column}:`, error);
    return false;
  }
}
