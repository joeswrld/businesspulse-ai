-- Create a function to notify via Supabase Realtime when new feedback is inserted
CREATE OR REPLACE FUNCTION notify_new_feedback_realtime()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification with feedback data via pg_notify
  PERFORM pg_notify(
    'new_feedback',
    json_build_object(
      'feedback_id', NEW.id,
      'user_id', NEW.user_id,
      'project_id', NEW.project_id,
      'message', NEW.message,
      'name', NEW.name,
      'email', NEW.email,
      'timestamp', NEW.timestamp,
      'action', 'INSERT'
    )::text
  );
  
  -- Log the notification
  RAISE LOG 'Notified new feedback: %', NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS feedback_realtime_trigger ON feedback;
CREATE TRIGGER feedback_realtime_trigger
  AFTER INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_feedback_realtime();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT EXECUTE ON FUNCTION notify_new_feedback_realtime() TO postgres;