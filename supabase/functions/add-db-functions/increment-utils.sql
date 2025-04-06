
-- Function to increment a column in any table by ID
CREATE OR REPLACE FUNCTION public.increment_column_value(
  p_row_id UUID,
  p_table_name TEXT,
  p_column_name TEXT,
  p_increment_by INT DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  query TEXT;
BEGIN
  -- Validate input to avoid SQL injection
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = p_table_name AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
    RETURN FALSE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = p_table_name AND column_name = p_column_name AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Invalid column name: %', p_column_name;
    RETURN FALSE;
  END IF;
  
  -- Build and execute the update query
  query := format(
    'UPDATE public.%I SET %I = %I + $1 WHERE id = $2',
    p_table_name, p_column_name, p_column_name
  );
  
  EXECUTE query USING p_increment_by, p_row_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in increment_column_value: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Function to check if a row exists in any table
CREATE OR REPLACE FUNCTION public.check_row_exists(
  p_table_name TEXT,
  p_column_name TEXT,
  p_value TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  query TEXT;
  row_exists BOOLEAN;
BEGIN
  -- Validate input to avoid SQL injection
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = p_table_name AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
    RETURN FALSE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = p_table_name AND column_name = p_column_name AND table_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Invalid column name: %', p_column_name;
    RETURN FALSE;
  END IF;
  
  -- Build and execute the select query
  query := format(
    'SELECT EXISTS(SELECT 1 FROM public.%I WHERE %I = $1)',
    p_table_name, p_column_name
  );
  
  EXECUTE query INTO row_exists USING p_value;
  
  RETURN row_exists;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in check_row_exists: %', SQLERRM;
    RETURN FALSE;
END;
$$;
