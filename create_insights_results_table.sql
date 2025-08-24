-- Create insights_results table for storing AI analysis results
-- This table stores the results of Gemini AI analysis for uploaded files

-- Drop existing table if it exists (for idempotency)
DROP TABLE IF EXISTS insights_results CASCADE;

-- Create the insights_results table
CREATE TABLE insights_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    summary TEXT NOT NULL,
    key_themes TEXT[] NOT NULL DEFAULT '{}',
    suggested_actions TEXT[] NOT NULL DEFAULT '{}',
    trends TEXT[] NOT NULL DEFAULT '{}',
    performance JSONB NOT NULL DEFAULT '{}',
    sentiment JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_insights_results_user_id ON insights_results(user_id);
CREATE INDEX idx_insights_results_created_at ON insights_results(created_at DESC);
CREATE INDEX idx_insights_results_file_id ON insights_results(file_id);

-- Create unique constraint to prevent duplicate file analysis for the same user
CREATE UNIQUE INDEX idx_insights_results_user_file_unique ON insights_results(user_id, file_id);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_insights_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_insights_results_updated_at
    BEFORE UPDATE ON insights_results
    FOR EACH ROW
    EXECUTE FUNCTION update_insights_results_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE insights_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own insights results
CREATE POLICY "Users can view their own insights results" ON insights_results
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own insights results
CREATE POLICY "Users can insert their own insights results" ON insights_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own insights results
CREATE POLICY "Users can update their own insights results" ON insights_results
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own insights results
CREATE POLICY "Users can delete their own insights results" ON insights_results
    FOR DELETE USING (auth.uid() = user_id);

-- Helper function to get insights results for a user
CREATE OR REPLACE FUNCTION get_user_insights_results(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    file_id TEXT,
    file_name TEXT,
    summary TEXT,
    key_themes TEXT[],
    suggested_actions TEXT[],
    trends TEXT[],
    performance JSONB,
    sentiment JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ir.id,
        ir.file_id,
        ir.file_name,
        ir.summary,
        ir.key_themes,
        ir.suggested_actions,
        ir.trends,
        ir.performance,
        ir.sentiment,
        ir.created_at
    FROM insights_results ir
    WHERE ir.user_id = p_user_id
    ORDER BY ir.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to create a new insights result
CREATE OR REPLACE FUNCTION create_insights_result(
    p_user_id UUID,
    p_file_id TEXT,
    p_file_name TEXT,
    p_summary TEXT,
    p_key_themes TEXT[],
    p_suggested_actions TEXT[],
    p_trends TEXT[],
    p_performance JSONB,
    p_sentiment JSONB
)
RETURNS insights_results AS $$
DECLARE
    result insights_results;
BEGIN
    INSERT INTO insights_results (
        user_id,
        file_id,
        file_name,
        summary,
        key_themes,
        suggested_actions,
        trends,
        performance,
        sentiment
    ) VALUES (
        p_user_id,
        p_file_id,
        p_file_name,
        p_summary,
        p_key_themes,
        p_suggested_actions,
        p_trends,
        p_performance,
        p_sentiment
    )
    ON CONFLICT (user_id, file_id) 
    DO UPDATE SET
        file_name = EXCLUDED.file_name,
        summary = EXCLUDED.summary,
        key_themes = EXCLUDED.key_themes,
        suggested_actions = EXCLUDED.suggested_actions,
        trends = EXCLUDED.trends,
        performance = EXCLUDED.performance,
        sentiment = EXCLUDED.sentiment,
        updated_at = NOW()
    RETURNING * INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to delete insights result
CREATE OR REPLACE FUNCTION delete_insights_result(p_user_id UUID, p_result_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM insights_results 
    WHERE user_id = p_user_id AND id = p_result_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test function to verify the table structure
CREATE OR REPLACE FUNCTION test_insights_results_table()
RETURNS TEXT AS $$
BEGIN
    -- Check if table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'insights_results') THEN
        RETURN 'ERROR: insights_results table does not exist';
    END IF;
    
    -- Check if RLS is enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'insights_results' 
        AND rowsecurity = true
    ) THEN
        RETURN 'ERROR: RLS is not enabled on insights_results table';
    END IF;
    
    -- Check if policies exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'insights_results'
    ) THEN
        RETURN 'ERROR: No RLS policies found on insights_results table';
    END IF;
    
    RETURN 'SUCCESS: insights_results table is properly configured';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON insights_results TO authenticated;
GRANT USAGE ON SEQUENCE insights_results_id_seq TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE insights_results IS 'Stores AI analysis results from Gemini AI for uploaded files';
COMMENT ON COLUMN insights_results.id IS 'Unique identifier for the analysis result';
COMMENT ON COLUMN insights_results.user_id IS 'User who uploaded the file and requested analysis';
COMMENT ON COLUMN insights_results.file_id IS 'Unique identifier for the uploaded file';
COMMENT ON COLUMN insights_results.file_name IS 'Original name of the uploaded file';
COMMENT ON COLUMN insights_results.summary IS 'Comprehensive summary of the analysis';
COMMENT ON COLUMN insights_results.key_themes IS 'Array of key themes identified in the data';
COMMENT ON COLUMN insights_results.suggested_actions IS 'Array of suggested actions based on analysis';
COMMENT ON COLUMN insights_results.trends IS 'Array of trends identified in the data';
COMMENT ON COLUMN insights_results.performance IS 'JSON object containing performance metrics and score';
COMMENT ON COLUMN insights_results.sentiment IS 'JSON object containing sentiment analysis results';
COMMENT ON COLUMN insights_results.created_at IS 'Timestamp when the analysis was created';
COMMENT ON COLUMN insights_results.updated_at IS 'Timestamp when the analysis was last updated';