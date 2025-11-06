import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useTrackPostView = () => {
  return useMutation({
    mutationFn: async (postId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('blog_post_views')
        .insert({
          post_id: postId,
          user_id: user?.id,
          ip_address: null, // IP tracking would need server-side implementation
          user_agent: navigator.userAgent,
        });

      if (error) throw error;
    },
  });
};

export const useBlogAnalytics = () => {
  return useQuery({
    queryKey: ['blog-analytics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Not authenticated');

      // Get all user's posts
      const { data: posts, error: postsError } = await supabase
        .from('blog_posts')
        .select('id, title, slug, view_count, published_at')
        .eq('user_id', user!.id)
        .eq('published', true);

      if (postsError) throw postsError;

      // Get views data for each post
      const postsWithAnalytics = await Promise.all(
        posts.map(async (post) => {
          // Get view count over time
          const { data: views, error: viewsError } = await supabase
            .from('blog_post_views')
            .select('viewed_at')
            .eq('post_id', post.id)
            .order('viewed_at', { ascending: false });

          if (viewsError) throw viewsError;

          // Get comment count
          const { count: commentCount, error: commentsError } = await supabase
            .from('blog_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id)
            .eq('status', 'approved');

          if (commentsError) throw commentsError;

          // Calculate views by day
          const viewsByDay = views.reduce((acc: Record<string, number>, view) => {
            const date = new Date(view.viewed_at).toLocaleDateString();
            acc[date] = (acc[date] || 0) + 1;
            return acc;
          }, {});

          return {
            ...post,
            commentCount: commentCount || 0,
            viewsByDay,
            totalViews: views.length,
          };
        })
      );

      // Calculate totals
      const totalViews = postsWithAnalytics.reduce((sum, post) => sum + post.totalViews, 0);
      const totalComments = postsWithAnalytics.reduce((sum, post) => sum + post.commentCount, 0);

      return {
        posts: postsWithAnalytics,
        totalViews,
        totalComments,
        totalPosts: posts.length,
      };
    },
  });
};
