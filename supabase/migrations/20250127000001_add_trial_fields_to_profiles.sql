-- Add trial fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '8 days'),
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'trial';

-- Update existing profiles to have trial fields if they don't exist
UPDATE profiles 
SET 
  trial_start = COALESCE(trial_start, CURRENT_TIMESTAMP),
  trial_end = COALESCE(trial_end, CURRENT_TIMESTAMP + INTERVAL '8 days'),
  plan_type = COALESCE(plan_type, 'trial')
WHERE trial_start IS NULL OR trial_end IS NULL OR plan_type IS NULL;

-- Create index for efficient trial expiration checks
CREATE INDEX IF NOT EXISTS idx_profiles_trial_end ON profiles(trial_end);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_type ON profiles(plan_type);