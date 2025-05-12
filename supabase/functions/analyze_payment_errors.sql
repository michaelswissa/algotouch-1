
-- Function to analyze payment error patterns
CREATE OR REPLACE FUNCTION public.analyze_payment_errors()
RETURNS TABLE (message text, count bigint) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    payment_data->>'message' as message,
    COUNT(*) as count
  FROM 
    payment_logs
  WHERE 
    payment_status = 'error' AND
    created_at > NOW() - INTERVAL '7 days'
  GROUP BY 
    payment_data->>'message'
  ORDER BY 
    count DESC;
$$;
