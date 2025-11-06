import { useState } from 'react';
import { useBlogComments, useCreateComment, BlogComment } from '@/hooks/useBlogComments';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Reply } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BlogCommentsProps {
  postId: string;
}

export const BlogComments = ({ postId }: BlogCommentsProps) => {
  const { data: comments, isLoading } = useBlogComments(postId);
  const createComment = useCreateComment();
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    author_name: '',
    author_email: '',
    content: '',
  });

  const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    
    await createComment.mutateAsync({
      post_id: postId,
      parent_id: parentId,
      ...formData,
    });

    setFormData({ author_name: '', author_email: '', content: '' });
    setReplyTo(null);
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: BlogComment; depth?: number }) => (
    <div className={`${depth > 0 ? 'ml-8 mt-4' : 'mt-6'}`}>
      <Card className="p-4">
        <div className="flex gap-3">
          <Avatar>
            <AvatarFallback>
              {comment.author_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">{comment.author_name}</span>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm mb-2">{comment.content}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyTo(comment.id)}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>

            {replyTo === comment.id && (
              <form onSubmit={(e) => handleSubmit(e, comment.id)} className="mt-4 space-y-3">
                <Input
                  placeholder="Your name"
                  value={formData.author_name}
                  onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                  required
                />
                <Input
                  type="email"
                  placeholder="Your email"
                  value={formData.author_email}
                  onChange={(e) => setFormData({ ...formData, author_email: e.target.value })}
                  required
                />
                <Textarea
                  placeholder="Write your reply..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm">Post Reply</Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setReplyTo(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </Card>

      {comment.replies?.map((reply) => (
        <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </div>
  );

  if (isLoading) {
    return <div>Loading comments...</div>;
  }

  return (
    <div className="mt-12">
      <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <MessageSquare className="h-6 w-6" />
        Comments ({comments?.length || 0})
      </h3>

      <Card className="p-6 mb-8">
        <h4 className="font-semibold mb-4">Leave a Comment</h4>
        <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
          <Input
            placeholder="Your name"
            value={formData.author_name}
            onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
            required
          />
          <Input
            type="email"
            placeholder="Your email"
            value={formData.author_email}
            onChange={(e) => setFormData({ ...formData, author_email: e.target.value })}
            required
          />
          <Textarea
            placeholder="Write your comment..."
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={4}
            required
          />
          <Button type="submit" disabled={createComment.isPending}>
            Post Comment
          </Button>
        </form>
      </Card>

      <div>
        {comments?.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>
    </div>
  );
};
