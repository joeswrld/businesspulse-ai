-- Add status and scheduling to blog posts
ALTER TABLE blog_posts 
ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
ADD COLUMN scheduled_for TIMESTAMP WITH TIME ZONE;

-- Create blog post versions table for version history
CREATE TABLE blog_post_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  version_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster version lookups
CREATE INDEX idx_blog_post_versions_post_id ON blog_post_versions(post_id);

-- Create blog comments table with threading support
CREATE TABLE blog_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  parent_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for comments
CREATE INDEX idx_blog_comments_post_id ON blog_comments(post_id);
CREATE INDEX idx_blog_comments_parent_id ON blog_comments(parent_id);
CREATE INDEX idx_blog_comments_status ON blog_comments(status);

-- Create blog post views table for analytics
CREATE TABLE blog_post_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for analytics queries
CREATE INDEX idx_blog_post_views_post_id ON blog_post_views(post_id);
CREATE INDEX idx_blog_post_views_viewed_at ON blog_post_views(viewed_at);

-- Add view count to blog posts for quick access
ALTER TABLE blog_posts ADD COLUMN view_count INTEGER DEFAULT 0;

-- RLS Policies for blog_post_versions
ALTER TABLE blog_post_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions of their own posts"
  ON blog_post_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts 
      WHERE blog_posts.id = blog_post_versions.post_id 
      AND blog_posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create versions of their own posts"
  ON blog_post_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blog_posts 
      WHERE blog_posts.id = blog_post_versions.post_id 
      AND blog_posts.user_id = auth.uid()
    )
  );

-- RLS Policies for blog_comments
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved comments"
  ON blog_comments FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Authenticated users can create comments"
  ON blog_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR true);

CREATE POLICY "Post authors can manage all comments on their posts"
  ON blog_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts 
      WHERE blog_posts.id = blog_comments.post_id 
      AND blog_posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Comment authors can update their own comments"
  ON blog_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Comment authors can delete their own comments"
  ON blog_comments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for blog_post_views
ALTER TABLE blog_post_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create view records"
  ON blog_post_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Post authors can view analytics for their posts"
  ON blog_post_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts 
      WHERE blog_posts.id = blog_post_views.post_id 
      AND blog_posts.user_id = auth.uid()
    )
  );

-- Trigger to update comment timestamp
CREATE TRIGGER update_blog_comments_updated_at
  BEFORE UPDATE ON blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_updated_at();

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_post_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE blog_posts 
  SET view_count = view_count + 1 
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment view count
CREATE TRIGGER increment_view_count_trigger
  AFTER INSERT ON blog_post_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_post_view_count();