-- Create a function to send email notification directly from database
CREATE OR REPLACE FUNCTION send_feedback_email_direct()
RETURNS TRIGGER AS $$
DECLARE
  user_email text;
  notification_payload jsonb;
  response text;
  edge_function_url text;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = NEW.user_id;
  
  -- If no email found, log and return
  IF user_email IS NULL THEN
    RAISE LOG 'No email found for user_id: %', NEW.user_id;
    RETURN NEW;
  END IF;

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

  -- Get the Edge Function URL from environment
  edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-feedback-email';
  
  -- If no custom URL is set, construct it from the current database URL
  IF edge_function_url IS NULL OR edge_function_url = '/functions/v1/send-feedback-email' THEN
    -- Extract project reference from the current database URL
    edge_function_url := 'https://' || current_setting('app.settings.project_ref', true) || '.supabase.co/functions/v1/send-feedback-email';
  END IF;

  -- Log the notification attempt
  RAISE LOG 'Sending feedback email notification for feedback_id: % to email: %', NEW.id, user_email;

  -- Send HTTP request to Edge Function using the service role key
  BEGIN
    PERFORM
      net.http_post(
        url := edge_function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := notification_payload::text
      );
    
    RAISE LOG 'Email notification sent successfully for feedback_id: %', NEW.id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE LOG 'Failed to send email notification for feedback_id: %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS feedback_email_direct_trigger ON feedback;
CREATE TRIGGER feedback_email_direct_trigger
  AFTER INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION send_feedback_email_direct();

-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT EXECUTE ON FUNCTION send_feedback_email_direct() TO postgres;