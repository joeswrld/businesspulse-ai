-- Add sentiment column to feedback table
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral'));

-- Create index for sentiment column for better performance
CREATE INDEX IF NOT EXISTS idx_feedback_sentiment ON feedback(sentiment);

-- Update existing feedbacks with NULL sentiment to 'neutral' as fallback
UPDATE feedback 
SET sentiment = 'neutral' 
WHERE sentiment IS NULL;

-- Add comment
COMMENT ON COLUMN feedback.sentiment IS 'AI-analyzed sentiment of the feedback message';