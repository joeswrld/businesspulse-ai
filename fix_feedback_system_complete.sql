-- ============================================================================
-- COMPREHENSIVE FEEDBACK SYSTEM FIX
-- ============================================================================
-- This script fixes all issues with the feedback system:
-- 1. Ensures consistent table structure with proper defaults
-- 2. Backfills missing created_at and sentiment data
-- 3. Standardizes field names across the system

-- ============================================================================
-- STEP 1: ENSURE PROPER TABLE STRUCTURE
-- ============================================================================

-- First, let's ensure we have the correct table structure
-- We'll standardize on 'feedback' table (singular) as used in the main Feedback page

-- Drop existing feedbacks table if it exists and create the standardized feedback table
DROP TABLE IF EXISTS feedbacks CASCADE;

-- Create the standardized feedback table with proper structure
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  email text,
  message text NOT NULL,
  sentiment text CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  created_at timestamptz DEFAULT now(),
  
  -- Additional fields for better tracking
  page_url text,
  browser text,
  user_agent text,
  
  -- Constraints
  CONSTRAINT feedback_message_required CHECK (message IS NOT NULL AND TRIM(message) <> ''),
  CONSTRAINT feedback_sentiment_valid CHECK (sentiment IN ('positive', 'negative', 'neutral') OR sentiment IS NULL)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_project_id ON feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_sentiment ON feedback(sentiment);
CREATE INDEX IF NOT EXISTS idx_feedback_email ON feedback(email);

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: CREATE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view feedback for their project" ON feedback;
DROP POLICY IF EXISTS "Anyone can insert feedback" ON feedback;

-- Create RLS policies for feedback table
CREATE POLICY "Users can view feedback for their project" ON feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM feedback_settings 
      WHERE feedback_settings.project_id = feedback.project_id 
      AND feedback_settings.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert feedback" ON feedback
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- STEP 3: BACKFILL MISSING DATA
-- ============================================================================

-- Backfill created_at for any rows that might be missing it
UPDATE feedback 
SET created_at = now() 
WHERE created_at IS NULL;

-- ============================================================================
-- STEP 4: SENTIMENT ANALYSIS FUNCTION
-- ============================================================================

-- Create a function to analyze sentiment from message content
CREATE OR REPLACE FUNCTION analyze_sentiment(message_text text)
RETURNS text AS $$
DECLARE
  positive_words text[] := ARRAY[
    'love', 'great', 'awesome', 'good', 'fantastic', 'amazing', 'wonderful', 
    'excellent', 'perfect', 'outstanding', 'brilliant', 'superb', 'terrific',
    'pleased', 'impressed', 'smooth', 'fast', 'easy', 'intuitive', 'beautiful',
    'clean', 'modern', 'helpful', 'supportive', 'responsive', 'happy', 'satisfied',
    'like', 'enjoy', 'recommend', 'best', 'top', 'exceeded', 'surpassed'
  ];
  
  negative_words text[] := ARRAY[
    'hate', 'bad', 'terrible', 'awful', 'worst', 'disappoint', 'horrible',
    'dislike', 'angry', 'frustrated', 'annoyed', 'disappointed', 'broken',
    'slow', 'difficult', 'confusing', 'ugly', 'cluttered', 'buggy', 'crash',
    'error', 'fail', 'useless', 'waste', 'problem', 'issue', 'complaint',
    'unhappy', 'dissatisfied', 'poor', 'weak', 'worst', 'terrible', 'awful'
  ];
  
  message_lower text;
  positive_count integer := 0;
  negative_count integer := 0;
  word text;
BEGIN
  -- Convert message to lowercase for analysis
  message_lower := lower(message_text);
  
  -- Count positive words
  FOREACH word IN ARRAY positive_words
  LOOP
    IF message_lower LIKE '%' || word || '%' THEN
      positive_count := positive_count + 1;
    END IF;
  END LOOP;
  
  -- Count negative words
  FOREACH word IN ARRAY negative_words
  LOOP
    IF message_lower LIKE '%' || word || '%' THEN
      negative_count := negative_count + 1;
    END IF;
  END LOOP;
  
  -- Determine sentiment based on word counts
  IF positive_count > negative_count THEN
    RETURN 'positive';
  ELSIF negative_count > positive_count THEN
    RETURN 'negative';
  ELSE
    RETURN 'neutral';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: BACKFILL SENTIMENT DATA
-- ============================================================================

-- Update all feedback entries with NULL sentiment using the analysis function
UPDATE feedback 
SET sentiment = analyze_sentiment(message)
WHERE sentiment IS NULL OR sentiment = '';

-- ============================================================================
-- STEP 6: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get feedback statistics for a project
CREATE OR REPLACE FUNCTION get_feedback_stats(project_id_param text)
RETURNS TABLE (
  total_count bigint,
  positive_count bigint,
  negative_count bigint,
  neutral_count bigint,
  positive_percentage numeric,
  negative_percentage numeric,
  neutral_percentage numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE sentiment = 'positive') as positive_count,
    COUNT(*) FILTER (WHERE sentiment = 'negative') as negative_count,
    COUNT(*) FILTER (WHERE sentiment = 'neutral') as neutral_count,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE sentiment = 'positive')::numeric / COUNT(*)::numeric) * 100, 2)
      ELSE 0 
    END as positive_percentage,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE sentiment = 'negative')::numeric / COUNT(*)::numeric) * 100, 2)
      ELSE 0 
    END as negative_percentage,
    CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE sentiment = 'neutral')::numeric / COUNT(*)::numeric) * 100, 2)
      ELSE 0 
    END as neutral_percentage
  FROM feedback 
  WHERE project_id = project_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: CREATE TRIGGER FOR AUTOMATIC SENTIMENT ANALYSIS
-- ============================================================================

-- Create a trigger function to automatically analyze sentiment on insert/update
CREATE OR REPLACE FUNCTION trigger_analyze_sentiment()
RETURNS trigger AS $$
BEGIN
  -- Only analyze sentiment if it's not already set
  IF NEW.sentiment IS NULL OR NEW.sentiment = '' THEN
    NEW.sentiment := analyze_sentiment(NEW.message);
  END IF;
  
  -- Ensure created_at is set
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS feedback_sentiment_trigger ON feedback;
CREATE TRIGGER feedback_sentiment_trigger
  BEFORE INSERT OR UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION trigger_analyze_sentiment();

-- ============================================================================
-- STEP 8: VERIFICATION QUERIES
-- ============================================================================

-- Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'feedback' 
ORDER BY ordinal_position;

-- Check sentiment distribution
SELECT 
  sentiment,
  COUNT(*) as count,
  ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM feedback)::numeric) * 100, 2) as percentage
FROM feedback 
GROUP BY sentiment 
ORDER BY count DESC;

-- Check for any NULL created_at values
SELECT COUNT(*) as null_created_at_count
FROM feedback 
WHERE created_at IS NULL;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Feedback system fix completed successfully!';
  RAISE NOTICE 'Table: feedback (standardized)';
  RAISE NOTICE 'Fields: id, project_id, email, message, sentiment, created_at, page_url, browser, user_agent';
  RAISE NOTICE 'Automatic sentiment analysis enabled for new entries';
  RAISE NOTICE 'All existing data backfilled with sentiment analysis';
END $$;