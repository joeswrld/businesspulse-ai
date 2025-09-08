-- Fix usage_counters table schema
-- This script will drop and recreate the table with the correct structure

-- First, drop the existing table if it exists
DROP TABLE IF EXISTS usage_counters CASCADE;

-- Create the usage_counters table with correct structure
CREATE TABLE usage_counters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  feedback_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one row per user per month
  UNIQUE(user_id, month_start)
);

-- Create indexes for efficient lookups
CREATE INDEX idx_usage_counters_user_month ON usage_counters(user_id, month_start);
CREATE INDEX idx_usage_counters_feedback_count ON usage_counters(feedback_count);

-- Enable RLS (Row Level Security)
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own usage counters" 
ON usage_counters FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage counters" 
ON usage_counters FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage counters" 
ON usage_counters FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_usage_counters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_usage_counters_updated_at_trigger
  BEFORE UPDATE ON usage_counters
  FOR EACH ROW
  EXECUTE FUNCTION update_usage_counters_updated_at();

-- Grant necessary permissions
GRANT ALL ON usage_counters TO authenticated;
GRANT ALL ON usage_counters TO service_role;

-- Verify the table was created correctly
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'usage_counters' 
ORDER BY ordinal_position;