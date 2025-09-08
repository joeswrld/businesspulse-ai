-- Create a function to send email notification via Edge Function
CREATE OR REPLACE FUNCTION send_feedback_email_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_payload jsonb;
  response text;
  edge_function_url text;
BEGIN
  -- Construct the notification payload
  notification_payload := json_build_object(
    'feedback_id', NEW.id,
    'user_id', NEW.user_id,
    'project_id', NEW.project_id,
    'message', NEW.message,
    'name', NEW.name,
    'email', NEW.email,
    'timestamp', NEW.timestamp
  );

  -- Get the Edge Function URL from environment or construct it
  -- This assumes your Supabase project URL is available
  edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-feedback-email';
  
  -- If no custom URL is set, use a default pattern
  IF edge_function_url IS NULL OR edge_function_url = '/functions/v1/send-feedback-email' THEN
    edge_function_url := 'https://your-project-ref.supabase.co/functions/v1/send-feedback-email';
  END IF;

  -- Log the notification attempt
  RAISE LOG 'Sending feedback email notification for feedback_id: %', NEW.id;

  -- Send HTTP request to Edge Function
  BEGIN
    SELECT content INTO response
    FROM http((
      'POST',
      edge_function_url,
      ARRAY[http_header('Content-Type', 'application/json')],
      'application/json',
      notification_payload::text
    ));
    
    RAISE LOG 'Email notification response: %', response;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE LOG 'Failed to send email notification: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS feedback_email_trigger ON feedback;
CREATE TRIGGER feedback_email_trigger
  AFTER INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION send_feedback_email_notification();

-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT EXECUTE ON FUNCTION send_feedback_email_notification() TO postgres;