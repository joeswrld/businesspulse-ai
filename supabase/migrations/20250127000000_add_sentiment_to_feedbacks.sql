-- Add sentiment column to feedbacks table
ALTER TABLE feedbacks 
ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral'));

-- Create index for sentiment column for better performance
CREATE INDEX IF NOT EXISTS idx_feedbacks_sentiment ON feedbacks(sentiment);

-- Update existing feedbacks with NULL sentiment to 'neutral' as fallback
UPDATE feedbacks 
SET sentiment = 'neutral' 
WHERE sentiment IS NULL;