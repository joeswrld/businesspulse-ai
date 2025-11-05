import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useBlogCategories, useCreateBlogPost, useUpdateBlogPost, BlogPost } from '@/hooks/useBlog';
import { Loader2 } from 'lucide-react';

interface BlogPostFormProps {
  post?: BlogPost;
  onSuccess?: () => void;
}

export const BlogPostForm = ({ post, onSuccess }: BlogPostFormProps) => {
  const { data: categories } = useBlogCategories();
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const [published, setPublished] = useState(post?.published || false);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    defaultValues: {
      title: post?.title || '',
      slug: post?.slug || '',
      excerpt: post?.excerpt || '',
      content: post?.content || '',
      featured_image: post?.featured_image || '',
      category_id: post?.category_id || '',
      author_name: post?.author_name || '',
      seo_title: post?.seo_title || '',
      seo_description: post?.seo_description || '',
      seo_keywords: post?.seo_keywords || '',
    },
  });

  const onSubmit = async (data: any) => {
    const postData = {
      ...data,
      published,
    };

    if (post) {
      await updatePost.mutateAsync({ id: post.id, ...postData });
    } else {
      await createPost.mutateAsync(postData);
    }
    
    onSuccess?.();
  };

  const isLoading = createPost.isPending || updatePost.isPending;

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            {...register('title', { required: 'Title is required' })}
            placeholder="Enter post title"
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input
            id="slug"
            {...register('slug')}
            placeholder="auto-generated-from-title"
          />
          <p className="text-xs text-muted-foreground">Leave empty to auto-generate from title</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="excerpt">Excerpt</Label>
          <Textarea
            id="excerpt"
            {...register('excerpt')}
            placeholder="Short description of the post"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content *</Label>
          <Textarea
            id="content"
            {...register('content', { required: 'Content is required' })}
            placeholder="Write your post content here..."
            rows={12}
          />
          {errors.content && <p className="text-sm text-destructive">{errors.content.message}</p>}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="featured_image">Featured Image URL</Label>
            <Input
              id="featured_image"
              {...register('featured_image')}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="author_name">Author Name</Label>
            <Input
              id="author_name"
              {...register('author_name')}
              placeholder="John Doe"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select onValueChange={(value) => setValue('category_id', value)} defaultValue={post?.category_id || ''}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold">SEO Settings</h3>
          
          <div className="space-y-2">
            <Label htmlFor="seo_title">SEO Title</Label>
            <Input
              id="seo_title"
              {...register('seo_title')}
              placeholder="Title for search engines (60 chars max)"
              maxLength={60}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seo_description">SEO Description</Label>
            <Textarea
              id="seo_description"
              {...register('seo_description')}
              placeholder="Description for search engines (160 chars max)"
              rows={2}
              maxLength={160}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seo_keywords">SEO Keywords</Label>
            <Input
              id="seo_keywords"
              {...register('seo_keywords')}
              placeholder="keyword1, keyword2, keyword3"
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="published"
              checked={published}
              onCheckedChange={setPublished}
            />
            <Label htmlFor="published">Publish immediately</Label>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {post ? 'Update Post' : 'Create Post'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
