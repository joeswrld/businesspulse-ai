-- Create core tables for NoteX application

-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create normalized_docs table for processed documents
CREATE TABLE IF NOT EXISTS normalized_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  processing_status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create doc_chunks table with vector embeddings
CREATE TABLE IF NOT EXISTS doc_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_doc_id UUID NOT NULL REFERENCES normalized_docs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536), -- Gemini embeddings are 1536 dimensions
  chunk_index INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_insights_feedback table for user feedback
CREATE TABLE IF NOT EXISTS ai_insights_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID NOT NULL REFERENCES ai_insights(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down', 'bookmark')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create action_plans table for insights
CREATE TABLE IF NOT EXISTS action_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID NOT NULL REFERENCES ai_insights(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics_daily table for aggregated analytics
CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_insights INTEGER DEFAULT 0,
  high_priority_insights INTEGER DEFAULT 0,
  avg_confidence_score DECIMAL(3,2) DEFAULT 0,
  total_feedback INTEGER DEFAULT 0,
  positive_feedback_ratio DECIMAL(3,2) DEFAULT 0,
  retention_risk_score DECIMAL(3,2) DEFAULT 0,
  upsell_potential_score DECIMAL(3,2) DEFAULT 0,
  operational_bottleneck_score DECIMAL(3,2) DEFAULT 0,
  market_expansion_score DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create paystack_webhooks table for billing integration
CREATE TABLE IF NOT EXISTS paystack_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_normalized_docs_user_id ON normalized_docs(user_id);
CREATE INDEX IF NOT EXISTS idx_normalized_docs_data_source_id ON normalized_docs(data_source_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_user_id ON doc_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_normalized_doc_id ON doc_chunks(normalized_doc_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding ON doc_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_ai_insights_feedback_insight_id ON ai_insights_feedback(insight_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_feedback_user_id ON ai_insights_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_user_id ON action_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_insight_id ON action_plans(insight_id);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_user_id_date ON analytics_daily(user_id, date);
CREATE INDEX IF NOT EXISTS idx_paystack_webhooks_processed ON paystack_webhooks(processed);

-- Enable Row Level Security
ALTER TABLE normalized_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE paystack_webhooks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for normalized_docs
CREATE POLICY "Users can view their own normalized docs" ON normalized_docs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own normalized docs" ON normalized_docs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own normalized docs" ON normalized_docs
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for doc_chunks
CREATE POLICY "Users can view their own doc chunks" ON doc_chunks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own doc chunks" ON doc_chunks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own doc chunks" ON doc_chunks
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for ai_insights_feedback
CREATE POLICY "Users can view their own feedback" ON ai_insights_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback" ON ai_insights_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback" ON ai_insights_feedback
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for action_plans
CREATE POLICY "Users can view their own action plans" ON action_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own action plans" ON action_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own action plans" ON action_plans
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for analytics_daily
CREATE POLICY "Users can view their own analytics" ON analytics_daily
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics" ON analytics_daily
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics" ON analytics_daily
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for paystack_webhooks (admin only)
CREATE POLICY "Only service role can access webhooks" ON paystack_webhooks
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_normalized_docs_updated_at BEFORE UPDATE ON normalized_docs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_action_plans_updated_at BEFORE UPDATE ON action_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_daily_updated_at BEFORE UPDATE ON analytics_daily
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for new tables
ALTER TABLE normalized_docs REPLICA IDENTITY FULL;
ALTER TABLE doc_chunks REPLICA IDENTITY FULL;
ALTER TABLE ai_insights_feedback REPLICA IDENTITY FULL;
ALTER TABLE action_plans REPLICA IDENTITY FULL;
ALTER TABLE analytics_daily REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.normalized_docs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doc_chunks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_insights_feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE public.action_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_daily;