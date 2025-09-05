-- Create a function to send webhook notification for new feedback
CREATE OR REPLACE FUNCTION notify_feedback_webhook()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification with feedback data
  PERFORM pg_notify(
    'feedback_inserted',
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
  RAISE LOG 'Notified feedback insert: % for user: %', NEW.id, NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS feedback_webhook_trigger ON feedback;
CREATE TRIGGER feedback_webhook_trigger
  AFTER INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION notify_feedback_webhook();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT EXECUTE ON FUNCTION notify_feedback_webhook() TO postgres;