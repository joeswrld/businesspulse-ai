import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BlogPost {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  category_id: string | null;
  author_name: string | null;
  published: boolean;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  created_at: string;
  updated_at: string;
  blog_categories?: {
    name: string;
    slug: string;
  } | null;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

export const useBlogPosts = (filters?: { category?: string; published?: boolean }) => {
  return useQuery({
    queryKey: ['blog-posts', filters],
    queryFn: async () => {
      let query = supabase
        .from('blog_posts')
        .select('*, blog_categories(name, slug)')
        .order('published_at', { ascending: false, nullsFirst: false });

      if (filters?.category) {
        query = query.eq('blog_categories.slug', filters.category);
      }

      if (filters?.published !== undefined) {
        query = query.eq('published', filters.published);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BlogPost[];
    },
  });
};

export const useBlogPost = (slug: string) => {
  return useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*, blog_categories(name, slug)')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data as BlogPost;
    },
    enabled: !!slug,
  });
};

export const useBlogCategories = () => {
  return useQuery({
    queryKey: ['blog-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as BlogCategory[];
    },
  });
};

export const useCreateBlogPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: Partial<BlogPost>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const slug = post.slug || post.title?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { data, error } = await supabase
        .from('blog_posts')
        .insert({
          ...post,
          slug,
          user_id: user.id,
          published_at: post.published ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('Blog post created successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to create post: ${error.message}`);
    },
  });
};

export const useUpdateBlogPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BlogPost> & { id: string }) => {
      const { data, error } = await supabase
        .from('blog_posts')
        .update({
          ...updates,
          published_at: updates.published ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('Blog post updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update post: ${error.message}`);
    },
  });
};

export const useDeleteBlogPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      toast.success('Blog post deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete post: ${error.message}`);
    },
  });
};
