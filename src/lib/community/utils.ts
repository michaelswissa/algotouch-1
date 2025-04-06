
import { supabase } from '@/integrations/supabase/client';

/**
 * Helper function to increment a column value in a specified table
 */
export async function incrementColumnValue(
  rowId: string,
  tableName: string,
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
