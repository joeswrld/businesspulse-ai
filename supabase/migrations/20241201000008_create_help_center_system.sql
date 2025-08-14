-- NoteX Help Center System - Lovable Ready
-- Run this in your Supabase SQL Editor

-- 1. Create help_articles table for documentation
CREATE TABLE IF NOT EXISTS help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  content TEXT NOT NULL,
  excerpt TEXT,
  tags TEXT[] DEFAULT '{}',
  author_id UUID REFERENCES auth.users(id),
  is_published BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create help_categories table for organization
CREATE TABLE IF NOT EXISTS help_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#0066FF',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create support_tickets table for user support requests
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_number TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'waiting_on_user', 'resolved', 'closed')),
  assigned_to UUID REFERENCES auth.users(id),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create ticket_messages table for ticket conversations
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  attachments JSONB,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create ticket_attachments table for file uploads
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES ticket_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create support_chat table for real-time messaging
CREATE TABLE IF NOT EXISTS support_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'waiting', 'closed')),
  subject TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create chat_messages table for real-time chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES support_chat(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create knowledge_base table for AI-powered help
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  confidence_score DECIMAL(3,2) DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category);
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_tags ON help_articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_help_articles_published ON help_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_help_categories_slug ON help_categories(slug);
CREATE INDEX IF NOT EXISTS idx_help_categories_active ON help_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_number ON support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON ticket_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_support_chat_user_id ON support_chat(user_id);
CREATE INDEX IF NOT EXISTS idx_support_chat_status ON support_chat(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON knowledge_base USING GIN(tags);

-- 10. Enable Row Level Security
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies for security
-- Help articles are public for reading
CREATE POLICY "help_articles_view_all" ON help_articles
  FOR SELECT USING (is_published = true);

-- Only authors can edit their articles
CREATE POLICY "help_articles_author_edit" ON help_articles
  FOR ALL USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

-- Categories are public for reading
CREATE POLICY "help_categories_view_all" ON help_categories
  FOR SELECT USING (is_active = true);

-- Users can only see their own tickets
CREATE POLICY "support_tickets_owner_all" ON support_tickets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can only see messages from their tickets
CREATE POLICY "ticket_messages_owner_all" ON ticket_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE id = ticket_id AND user_id = auth.uid()
    )
  );

-- Users can only see attachments from their tickets
CREATE POLICY "ticket_attachments_owner_all" ON ticket_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE id = ticket_id AND user_id = auth.uid()
    )
  );

-- Users can only see their own chat sessions
CREATE POLICY "support_chat_owner_all" ON support_chat
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can only see messages from their chat sessions
CREATE POLICY "chat_messages_owner_all" ON chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM support_chat 
      WHERE id = chat_id AND user_id = auth.uid()
    )
  );

-- Knowledge base is public for reading
CREATE POLICY "knowledge_base_view_all" ON knowledge_base
  FOR SELECT USING (is_active = true);

-- 12. Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE help_articles;
ALTER PUBLICATION supabase_realtime ADD TABLE help_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_attachments;
ALTER PUBLICATION supabase_realtime ADD TABLE support_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE knowledge_base;

-- 13. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Create triggers for updated_at
CREATE TRIGGER trigger_update_help_articles_updated_at
  BEFORE UPDATE ON help_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_help_categories_updated_at
  BEFORE UPDATE ON help_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_support_chat_updated_at
  BEFORE UPDATE ON support_chat
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 15. Insert default help categories
INSERT INTO help_categories (name, slug, description, icon, color, sort_order) VALUES
  ('Getting Started', 'getting-started', 'Learn the basics of NoteX', 'play', '#0066FF', 1),
  ('AI Insights', 'ai-insights', 'Understanding and using AI insights', 'brain', '#007BFF', 2),
  ('Reports', 'reports', 'Creating and managing reports', 'file-text', '#28a745', 3),
  ('Data Upload', 'data-upload', 'Uploading and managing your data', 'upload', '#ffc107', 4),
  ('Account & Billing', 'account-billing', 'Manage your account and subscription', 'credit-card', '#dc3545', 5),
  ('API & Integrations', 'api-integrations', 'Connect NoteX with other tools', 'code', '#6f42c1', 6)
ON CONFLICT (slug) DO NOTHING;

-- 16. Insert sample help articles
INSERT INTO help_articles (title, slug, category, content, excerpt, tags) VALUES
  ('Welcome to NoteX', 'welcome-to-notex', 'Getting Started', 
   'Welcome to NoteX! This guide will help you get started with our AI-powered business intelligence platform.

## What is NoteX?

NoteX is an intelligent platform that helps you analyze your business data and generate actionable insights using advanced AI technology.

## Key Features

- **AI Insights**: Get intelligent analysis of your data
- **Smart Reports**: Generate comprehensive reports automatically
- **Data Upload**: Easily upload and manage your business data
- **Real-time Updates**: See changes and insights instantly

## Getting Started

1. Upload your first dataset
2. Generate AI insights
3. Create reports
4. Share with your team

Need help? Contact our support team!', 
   'Get started with NoteX in minutes. Learn the basics and discover how AI can transform your business intelligence.',
   ARRAY['getting-started', 'basics', 'introduction']),
  
  ('Understanding AI Insights', 'understanding-ai-insights', 'AI Insights',
   'AI Insights are intelligent analysis of your business data that provide actionable recommendations.

## How AI Insights Work

Our AI system analyzes your data to identify:
- **Trends and Patterns**: Discover hidden relationships in your data
- **Anomalies**: Spot unusual patterns that need attention
- **Opportunities**: Find areas for improvement and growth
- **Risks**: Identify potential issues before they become problems

## Insight Categories

- **Customer Analytics**: Understand customer behavior and satisfaction
- **Revenue Analysis**: Track growth, churn, and expansion opportunities
- **Operational Efficiency**: Identify process improvements
- **Market Trends**: Stay ahead of industry changes

## Using Insights

1. Review the insight summary
2. Check the confidence score
3. Read key findings and recommendations
4. Take action based on the insights

The higher the confidence score, the more reliable the insight.', 
   'Learn how AI insights work and how to use them to improve your business decisions.',
   ARRAY['ai-insights', 'analysis', 'intelligence', 'recommendations'])
ON CONFLICT (slug) DO NOTHING;

-- Success message
SELECT 'NoteX Help Center system created successfully!' as status;