-- Create feature_requests table for roadmap management
CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'In Progress', 'Released')),
  feedback_ids UUID[] DEFAULT '{}',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feature_requests_user_id ON feature_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_created_at ON feature_requests(created_at);

-- Enable RLS
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own feature requests" ON feature_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feature requests" ON feature_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feature requests" ON feature_requests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feature requests" ON feature_requests
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_feature_requests_updated_at
  BEFORE UPDATE ON feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_requests_updated_at();

-- Create function to send email notifications when feature is released
CREATE OR REPLACE FUNCTION notify_feature_released()
RETURNS TRIGGER AS $$
DECLARE
  feedback_record RECORD;
  user_email TEXT;
  feature_title TEXT;
  feature_description TEXT;
  notification_payload JSONB;
BEGIN
  -- Only trigger when status changes to 'Released'
  IF NEW.status = 'Released' AND OLD.status != 'Released' THEN
    feature_title := NEW.title;
    feature_description := COALESCE(NEW.description, 'No description provided');
    
    -- Get unique emails from linked feedback
    FOR feedback_record IN 
      SELECT DISTINCT f.email
      FROM feedback f
      WHERE f.id = ANY(NEW.feedback_ids)
      AND f.email IS NOT NULL
      AND f.email != ''
    LOOP
      user_email := feedback_record.email;
      
      -- Insert notification record
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        related_id
      ) VALUES (
        NEW.user_id,
        'Feature Released: ' || feature_title,
        'Great news! A feature you requested has been released: ' || feature_title || 
        CASE 
          WHEN feature_description != 'No description provided' 
          THEN '. Description: ' || feature_description 
          ELSE '' 
        END,
        'feature_released',
        NEW.id::text
      );
      
      -- Call the edge function to send email notification
      notification_payload := jsonb_build_object(
        'featureRequestId', NEW.id,
        'userEmail', user_email,
        'featureTitle', feature_title,
        'featureDescription', feature_description
      );
      
      -- Use pg_net to call the edge function
      PERFORM net.http_post(
        url := (SELECT 'https://' || project_ref || '.supabase.co/functions/v1/send-feature-release-notification' 
                FROM vault.secrets 
                WHERE name = 'supabase_url' 
                LIMIT 1),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret 
                                        FROM vault.decrypted_secrets 
                                        WHERE name = 'supabase_anon_key' 
                                        LIMIT 1)
        ),
        body := notification_payload
      );
      
      RAISE NOTICE 'Feature released notification sent to: %', user_email;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for feature release notifications
CREATE TRIGGER feature_released_notification
  AFTER UPDATE ON feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_feature_released();

-- Add sentiment column to feedback table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feedback' 
    AND column_name = 'sentiment'
  ) THEN
    ALTER TABLE feedback ADD COLUMN sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral'));
  END IF;
END $$;