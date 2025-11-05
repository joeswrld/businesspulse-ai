import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User } from 'lucide-react';
import { BlogPost } from '@/hooks/useBlog';
import { format } from 'date-fns';

interface BlogPostCardProps {
  post: BlogPost;
}

export const BlogPostCard = ({ post }: BlogPostCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {post.featured_image && (
        <div className="aspect-video overflow-hidden">
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}
      <CardContent className="p-6">
        {post.blog_categories && (
          <Badge variant="secondary" className="mb-2">
            {post.blog_categories.name}
          </Badge>
        )}
        <Link to={`/blog/${post.slug}`}>
          <h3 className="text-xl font-bold mb-2 hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
        </Link>
        {post.excerpt && (
          <p className="text-muted-foreground line-clamp-3 mb-4">{post.excerpt}</p>
        )}
      </CardContent>
      <CardFooter className="px-6 pb-6 flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          {post.author_name && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{post.author_name}</span>
            </div>
          )}
          {post.published_at && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(post.published_at), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};
