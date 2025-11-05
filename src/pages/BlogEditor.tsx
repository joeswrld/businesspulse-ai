import { useParams, useNavigate } from 'react-router-dom';
import { useBlogPost } from '@/hooks/useBlog';
import { BlogPostForm } from '@/components/blog/BlogPostForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BlogEditor = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isNewPost = slug === 'new';
  const { data: post, isLoading } = useBlogPost(slug || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
      } else {
        setIsAuthenticated(true);
      }
    };
    checkAuth();
  }, [navigate]);

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading && !isNewPost) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/blog')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Blog
        </Button>

        <h1 className="text-3xl font-bold mb-8">
          {isNewPost ? 'Create New Post' : 'Edit Post'}
        </h1>

        <BlogPostForm
          post={!isNewPost ? post : undefined}
          onSuccess={() => navigate('/blog')}
        />
      </div>
    </div>
  );
};

export default BlogEditor;
