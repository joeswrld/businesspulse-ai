-- Optimize dashboard queries by combining multiple calls
-- This migration creates optimized functions for faster data loading

-- Function to get all dashboard data in a single call
CREATE OR REPLACE FUNCTION get_dashboard_data(
  user_id_param UUID,
  limit_param INTEGER DEFAULT 50
)
RETURNS TABLE(
  feedbacks JSONB,
  subscription JSONB,
  project_settings JSONB,
  total_feedbacks INTEGER,
  positive_count INTEGER,
  negative_count INTEGER,
  neutral_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_ids TEXT[];
  feedback_data JSONB;
  subscription_data JSONB;
  settings_data JSONB;
  total_count INTEGER;
  pos_count INTEGER;
  neg_count INTEGER;
  neu_count INTEGER;
BEGIN
  -- Get project IDs for the user
  SELECT array_agg(project_id) INTO project_ids
  FROM feedback_settings 
  WHERE user_id = user_id_param 
  AND project_id IS NOT NULL 
  AND project_id != '';

  -- Get feedbacks if user has projects
  IF array_length(project_ids, 1) > 0 THEN
    SELECT 
      jsonb_agg(f.*),
      COUNT(*),
      COUNT(*) FILTER (WHERE analyze_feedback_sentiment(f.message) = 'positive'),
      COUNT(*) FILTER (WHERE analyze_feedback_sentiment(f.message) = 'negative'),
      COUNT(*) FILTER (WHERE analyze_feedback_sentiment(f.message) = 'neutral')
    INTO feedback_data, total_count, pos_count, neg_count, neu_count
    FROM (
      SELECT * FROM feedbacks f
      WHERE f.project_id = ANY(project_ids)
      ORDER BY f.timestamp DESC
      LIMIT limit_param
    ) f;
  ELSE
    feedback_data := '[]'::jsonb;
    total_count := 0;
    pos_count := 0;
    neg_count := 0;
    neu_count := 0;
  END IF;

  -- Get subscription data
  SELECT row_to_json(s.*) INTO subscription_data
  FROM user_subscriptions s
  WHERE s.user_id = user_id_param;

  -- Get project settings
  SELECT jsonb_agg(ps.*) INTO settings_data
  FROM (
    SELECT * FROM feedback_settings 
    WHERE user_id = user_id_param
  ) ps;

  -- Return all data
  RETURN QUERY
  SELECT 
    COALESCE(feedback_data, '[]'::jsonb),
    COALESCE(subscription_data, 'null'::jsonb),
    COALESCE(settings_data, '[]'::jsonb),
    total_count,
    pos_count,
    neg_count,
    neu_count;
END;
$$;

-- Function to analyze feedback sentiment (server-side)
CREATE OR REPLACE FUNCTION analyze_feedback_sentiment(message_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Convert to lowercase for case-insensitive matching
  message_text := lower(message_text);
  
  -- Check for positive words
  IF message_text ~ 'great|good|excellent|amazing|wonderful|fantastic|love|like|happy|satisfied|perfect|awesome|outstanding|brilliant|superb|terrific|pleased|impressed|smooth|fast|easy|intuitive|beautiful|clean|modern|helpful|supportive|responsive' THEN
    RETURN 'positive';
  END IF;
  
  -- Check for negative words
  IF message_text ~ 'bad|terrible|awful|horrible|hate|dislike|angry|frustrated|annoyed|disappointed|broken|slow|difficult|confusing|ugly|cluttered|buggy|crash|error|fail|useless|waste|problem|issue|complaint|unhappy|dissatisfied|poor|weak' THEN
    RETURN 'negative';
  END IF;
  
  -- Default to neutral
  RETURN 'neutral';
END;
$$;

-- Function to get feedback with sentiment analysis
CREATE OR REPLACE FUNCTION get_feedbacks_with_sentiment(
  project_ids TEXT[],
  limit_param INTEGER DEFAULT 50,
  offset_param INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  project_id TEXT,
  name TEXT,
  email TEXT,
  message TEXT,
  timestamp TIMESTAMP WITH TIME ZONE,
  status TEXT,
  sentiment TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.project_id,
    f.name,
    f.email,
    f.message,
    f.timestamp,
    f.status,
    analyze_feedback_sentiment(f.message) as sentiment
  FROM feedbacks f
  WHERE f.project_id = ANY(project_ids)
  ORDER BY f.timestamp DESC
  LIMIT limit_param
  OFFSET offset_param;
END;
$$;

-- Function to get dashboard stats
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  user_id_param UUID,
  date_range TEXT DEFAULT '30d'
)
RETURNS TABLE(
  total_feedback INTEGER,
  positive_sentiment INTEGER,
  negative_sentiment INTEGER,
  neutral_sentiment INTEGER,
  active_users INTEGER,
  top_themes JSONB,
  feedback_volume JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_ids TEXT[];
  start_date TIMESTAMP WITH TIME ZONE;
  end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get project IDs
  SELECT array_agg(project_id) INTO project_ids
  FROM feedback_settings 
  WHERE user_id = user_id_param 
  AND project_id IS NOT NULL 
  AND project_id != '';

  -- Calculate date range
  end_date := NOW();
  CASE date_range
    WHEN '7d' THEN start_date := end_date - INTERVAL '7 days';
    WHEN '30d' THEN start_date := end_date - INTERVAL '30 days';
    WHEN '90d' THEN start_date := end_date - INTERVAL '90 days';
    ELSE start_date := '1970-01-01'::timestamp;
  END CASE;

  -- Return stats if user has projects
  IF array_length(project_ids, 1) > 0 THEN
    RETURN QUERY
    SELECT 
      COUNT(*)::INTEGER as total_feedback,
      COUNT(*) FILTER (WHERE analyze_feedback_sentiment(f.message) = 'positive')::INTEGER as positive_sentiment,
      COUNT(*) FILTER (WHERE analyze_feedback_sentiment(f.message) = 'negative')::INTEGER as negative_sentiment,
      COUNT(*) FILTER (WHERE analyze_feedback_sentiment(f.message) = 'neutral')::INTEGER as neutral_sentiment,
      COUNT(DISTINCT COALESCE(f.name, f.email))::INTEGER as active_users,
      '[]'::jsonb as top_themes, -- TODO: Implement theme extraction
      jsonb_agg(
        jsonb_build_object(
          'date', DATE(f.timestamp),
          'count', 1
        )
      ) as feedback_volume
    FROM feedbacks f
    WHERE f.project_id = ANY(project_ids)
    AND f.timestamp >= start_date
    AND f.timestamp <= end_date;
  ELSE
    RETURN QUERY
    SELECT 
      0::INTEGER as total_feedback,
      0::INTEGER as positive_sentiment,
      0::INTEGER as negative_sentiment,
      0::INTEGER as neutral_sentiment,
      0::INTEGER as active_users,
      '[]'::jsonb as top_themes,
      '[]'::jsonb as feedback_volume;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_dashboard_data(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_feedback_sentiment(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_feedbacks_with_sentiment(TEXT[], INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID, TEXT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_dashboard_data(UUID, INTEGER) IS 'Get all dashboard data in a single optimized query';
COMMENT ON FUNCTION analyze_feedback_sentiment(TEXT) IS 'Analyze sentiment of feedback message server-side';
COMMENT ON FUNCTION get_feedbacks_with_sentiment(TEXT[], INTEGER, INTEGER) IS 'Get feedbacks with sentiment analysis and pagination';
COMMENT ON FUNCTION get_dashboard_stats(UUID, TEXT) IS 'Get dashboard statistics for a user';