-- Create a function to notify when new feedback is inserted
CREATE OR REPLACE FUNCTION notify_new_feedback()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification with feedback data
  PERFORM pg_notify(
    'new_feedback',
    json_build_object(
      'feedback_id', NEW.id,
      'user_id', NEW.user_id,
      'project_id', NEW.project_id,
      'message', NEW.message,
      'name', NEW.name,
      'email', NEW.email,
      'timestamp', NEW.timestamp
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS feedback_notify_trigger ON feedback;
CREATE TRIGGER feedback_notify_trigger
  AFTER INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_feedback();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;