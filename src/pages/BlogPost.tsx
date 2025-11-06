import { useParams } from 'react-router-dom';
import { useBlogPost } from '@/hooks/useBlog';
import { useTrackPostView } from '@/hooks/useBlogAnalytics';
import { BlogPostDetail } from '@/components/blog/BlogPostDetail';
import { BlogComments } from '@/components/blog/BlogComments';
import SEO from '@/components/SEO';
import { generateArticleSchema, generateBreadcrumbSchema } from '@/utils/structuredData';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = useBlogPost(slug || '');
  const trackView = useTrackPostView();

  useEffect(() => {
    if (post?.id) {
      trackView.mutate(post.id);
    }
  }, [post?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Post not found</h1>
          <p className="text-muted-foreground">The blog post you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const articleSchema = generateArticleSchema({
    title: post.title,
    description: post.excerpt || '',
    author: post.author_name || 'NoteX Team',
    publishedDate: post.published_at || post.created_at,
    modifiedDate: post.updated_at,
    image: post.featured_image,
    url: `/blog/${post.slug}`,
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: post.title, url: `/blog/${post.slug}` },
  ]);

  return (
    <div className="min-h-screen bg-background py-12">
      <SEO
        title={post.seo_title || `${post.title} - NoteX Blog`}
        description={post.seo_description || post.excerpt || ''}
        keywords={post.seo_keywords || ''}
        image={post.featured_image}
        url={`/blog/${post.slug}`}
        type="article"
        author={post.author_name || 'NoteX Team'}
        publishedTime={post.published_at || undefined}
        modifiedTime={post.updated_at}
        structuredData={[articleSchema, breadcrumbSchema]}
      />
      <div className="container mx-auto px-4">
        <BlogPostDetail post={post} />
        <BlogComments postId={post.id} />
      </div>
    </div>
  );
};

export default BlogPost;
