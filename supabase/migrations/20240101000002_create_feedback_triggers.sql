-- Create function to call the process-feedback Edge Function
CREATE OR REPLACE FUNCTION process_new_feedback()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the Edge Function to process the feedback
  PERFORM
    net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/process-feedback',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.header.apikey')
      ),
      body := jsonb_build_object('feedback_id', NEW.id)
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to process feedback after insertion
CREATE TRIGGER trigger_process_feedback
  AFTER INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION process_new_feedback();

-- Create function to update notification counts
CREATE OR REPLACE FUNCTION update_notification_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user's notification count in a separate table if needed
  -- This could be used for badge counts in the UI
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notification updates
CREATE TRIGGER trigger_update_notification_count
  AFTER INSERT OR UPDATE ON feedback_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_count();

-- Create function to log feedback analytics
CREATE OR REPLACE FUNCTION log_feedback_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert analytics event for feedback
  INSERT INTO analytics_events (event_type, event_data, user_id)
  VALUES (
    'feedback_submitted',
    jsonb_build_object(
      'feedback_id', NEW.id,
      'sentiment', NEW.sentiment,
      'priority', NEW.priority,
      'category', NEW.category,
      'has_email', CASE WHEN NEW.email IS NOT NULL THEN true ELSE false END,
      'has_name', CASE WHEN NEW.client_name IS NOT NULL THEN true ELSE false END
    ),
    NEW.user_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for feedback analytics
CREATE TRIGGER trigger_log_feedback_analytics
  AFTER INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION log_feedback_analytics();