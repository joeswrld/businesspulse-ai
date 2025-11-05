-- Create blog_categories table
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  author_name TEXT,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create blog_tags table
CREATE TABLE IF NOT EXISTS public.blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create blog_post_tags junction table
CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_user_id ON public.blog_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON public.blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(published);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at DESC);

-- Enable RLS
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blog_categories
CREATE POLICY "Anyone can view categories"
  ON public.blog_categories FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create categories"
  ON public.blog_categories FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update categories"
  ON public.blog_categories FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- RLS Policies for blog_posts
CREATE POLICY "Anyone can view published posts"
  ON public.blog_posts FOR SELECT
  USING (published = true OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can create posts"
  ON public.blog_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.blog_posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.blog_posts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for blog_tags
CREATE POLICY "Anyone can view tags"
  ON public.blog_tags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tags"
  ON public.blog_tags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for blog_post_tags
CREATE POLICY "Anyone can view post tags"
  ON public.blog_post_tags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage post tags"
  ON public.blog_post_tags FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.blog_posts WHERE id = post_id));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_blog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blog_categories_updated_at
  BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_updated_at();

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_updated_at();

-- Insert some default categories
INSERT INTO public.blog_categories (name, slug, description) VALUES
  ('Product Updates', 'product-updates', 'Latest features and improvements'),
  ('Best Practices', 'best-practices', 'Tips and strategies for success'),
  ('Customer Stories', 'customer-stories', 'Success stories from our users'),
  ('Company News', 'company-news', 'Updates and announcements')
ON CONFLICT (slug) DO NOTHING;