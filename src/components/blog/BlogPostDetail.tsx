import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, ArrowLeft, Share2, Edit, Trash2 } from 'lucide-react';
import { BlogPost, useDeleteBlogPost } from '@/hooks/useBlog';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { trackEvent } from '@/hooks/useGoogleAnalytics';

interface BlogPostDetailProps {
  post: BlogPost;
}

export const BlogPostDetail = ({ post }: BlogPostDetailProps) => {
  const navigate = useNavigate();
  const deletePost = useDeleteBlogPost();
  const [isAuthor, setIsAuthor] = useState(false);

  useEffect(() => {
    const checkAuthor = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthor(user?.id === post.user_id);
    };
    checkAuthor();

    // Track page view
    trackEvent('view_blog_post', {
      post_title: post.title,
      post_category: post.blog_categories?.name,
    });
  }, [post]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt || '',
          url,
        });
        trackEvent('share_blog_post', { post_title: post.title, method: 'native' });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
      trackEvent('share_blog_post', { post_title: post.title, method: 'clipboard' });
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this post?')) {
      await deletePost.mutateAsync(post.id);
      navigate('/blog');
    }
  };

  return (
    <article className="max-w-4xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate('/blog')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Blog
      </Button>

      {post.featured_image && (
        <div className="aspect-video w-full overflow-hidden rounded-lg mb-8">
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <header className="mb-8">
        {post.blog_categories && (
          <Badge variant="secondary" className="mb-4">
            {post.blog_categories.name}
          </Badge>
        )}
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 text-muted-foreground">
            {post.author_name && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{post.author_name}</span>
              </div>
            )}
            {post.published_at && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(post.published_at), 'MMMM d, yyyy')}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            {isAuthor && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/blog/edit/${post.slug}`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {post.excerpt && (
        <p className="text-xl text-muted-foreground mb-8 font-medium">
          {post.excerpt}
        </p>
      )}

      <div 
        className="prose prose-lg max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
};
