
-- Enable REPLICA IDENTITY FULL for payment_sessions to get complete row data
ALTER TABLE payment_sessions REPLICA IDENTITY FULL;

-- Add payment_sessions table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE payment_sessions;
