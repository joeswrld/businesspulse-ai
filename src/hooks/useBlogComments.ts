import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BlogComment {
  id: string;
  post_id: string;
  user_id: string | null;
  parent_id: string | null;
  author_name: string;
  author_email: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  created_at: string;
  updated_at: string;
  replies?: BlogComment[];
}

export const useBlogComments = (postId: string) => {
  return useQuery({
    queryKey: ['blog-comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_comments')
        .select('*')
        .eq('post_id', postId)
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Organize comments with replies
      const commentsMap = new Map<string, BlogComment>();
      const topLevelComments: BlogComment[] = [];

      data.forEach((comment: any) => {
        commentsMap.set(comment.id, { ...comment, replies: [] });
      });

      data.forEach((comment: any) => {
        const commentWithReplies = commentsMap.get(comment.id)!;
        if (comment.parent_id) {
          const parent = commentsMap.get(comment.parent_id);
          if (parent) {
            parent.replies!.push(commentWithReplies);
          }
        } else {
          topLevelComments.push(commentWithReplies);
        }
      });

      return topLevelComments;
    },
    enabled: !!postId,
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: {
      post_id: string;
      parent_id?: string;
      author_name: string;
      author_email: string;
      content: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('blog_comments')
        .insert({
          ...comment,
          user_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Notify post author via edge function
      await supabase.functions.invoke('send-comment-notification', {
        body: { commentId: data.id },
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['blog-comments', variables.post_id] });
      toast.success('Comment submitted for review');
    },
    onError: (error) => {
      toast.error(`Failed to submit comment: ${error.message}`);
    },
  });
};

export const useUpdateCommentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, postId }: { id: string; status: string; postId: string }) => {
      const { data, error } = await supabase
        .from('blog_comments')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['blog-comments', variables.postId] });
      toast.success('Comment status updated');
    },
    onError: (error) => {
      toast.error(`Failed to update comment: ${error.message}`);
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, postId }: { id: string; postId: string }) => {
      const { error } = await supabase
        .from('blog_comments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['blog-comments', variables.postId] });
      toast.success('Comment deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete comment: ${error.message}`);
    },
  });
};
