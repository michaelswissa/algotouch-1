
import { supabase } from '@/integrations/supabase/client';

// Define specific table names as a literal type instead of using keyof Database
// This avoids the excessive type instantiation errors
type TableNames = 
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
 */
export async function incrementColumnValue(
  rowId: string,
  tableName: TableNames,
  columnName: string,
  incrementBy: number = 1
): Promise<boolean> {
  try {
    // Get the current value
    const { data, error } = await supabase
      .from(tableName)
      .select(columnName)
      .eq('id', rowId)
      .single();
    
    if (error) {
      console.error(`Error fetching ${columnName} from ${tableName}:`, error);
      return false;
    }
    
    if (!data || !(columnName in data)) {
      console.error(`Column ${columnName} not found in table ${tableName}`);
      return false;
    }

    // Update with incremented value
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ [columnName]: data[columnName] + incrementBy })
      .eq('id', rowId);
    
    if (updateError) {
      console.error(`Error updating ${columnName} in ${tableName}:`, updateError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Exception in incrementColumnValue for ${tableName}.${columnName}:`, error);
    return false;
  }
}

/**
 * Helper function to check if a row exists in a table
 */
export async function rowExists(tableName: TableNames, column: string, value: string): Promise<boolean> {
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .eq(column, value);
    
    if (error) {
      console.error(`Error checking if row exists in ${tableName}:`, error);
      return false;
    }
    
    return count !== null && count > 0;
  } catch (error) {
    console.error(`Error in rowExists for ${tableName}.${column}:`, error);
    return false;
  }
}
