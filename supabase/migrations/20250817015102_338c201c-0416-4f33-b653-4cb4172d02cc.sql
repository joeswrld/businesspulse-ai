-- Fix the data_sources type constraint and update the generate-insights function
-- First, let's remove any existing type constraints and allow more file types
ALTER TABLE data_sources DROP CONSTRAINT IF EXISTS data_sources_type_check;

-- Add a new constraint that allows common file types and text input
ALTER TABLE data_sources ADD CONSTRAINT data_sources_type_check 
CHECK (type IN ('csv', 'pdf', 'docx', 'txt', 'text', 'xlsx', 'json'));

-- Update the status constraint to include all needed statuses
ALTER TABLE data_sources DROP CONSTRAINT IF EXISTS data_sources_status_check;
ALTER TABLE data_sources ADD CONSTRAINT data_sources_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- Ensure the ai_insights table has proper constraints
ALTER TABLE ai_insights DROP CONSTRAINT IF EXISTS ai_insights_priority_check;
ALTER TABLE ai_insights ADD CONSTRAINT ai_insights_priority_check 
CHECK (priority IN ('High', 'Medium', 'Low'));

-- Add some common categories for insights
ALTER TABLE ai_insights DROP CONSTRAINT IF EXISTS ai_insights_category_check;
ALTER TABLE ai_insights ADD CONSTRAINT ai_insights_category_check 
CHECK (insight_type IN ('business_opportunity', 'risk_alert', 'trend_analysis', 'operational_insight', 'customer_feedback', 'performance_metric'));

-- Update confidence_score to be between 0 and 1
ALTER TABLE ai_insights DROP CONSTRAINT IF EXISTS ai_insights_confidence_check;
ALTER TABLE ai_insights ADD CONSTRAINT ai_insights_confidence_check 
CHECK (confidence_score >= 0 AND confidence_score <= 1);

-- Enable realtime for both tables
ALTER TABLE data_sources REPLICA IDENTITY FULL;
ALTER TABLE ai_insights REPLICA IDENTITY FULL;

-- Add both tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE data_sources;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_insights;