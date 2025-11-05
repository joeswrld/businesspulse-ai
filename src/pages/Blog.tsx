import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Plus } from "lucide-react";
import { useBlogPosts, useBlogCategories } from "@/hooks/useBlog";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { generateBreadcrumbSchema } from "@/utils/structuredData";

const Blog = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const { data: posts, isLoading } = useBlogPosts({ published: true });
  const { data: categories } = useBlogCategories();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, []);

  const featuredPosts = posts?.filter(post => post.featured_image) || [];
  const filteredPosts = posts?.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (post.excerpt?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || post.blog_categories?.slug === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' }
  ]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Blog - NoteX | Insights on AI-Powered Feedback Analytics"
        description="Read the latest insights, product updates, and best practices for customer feedback analytics. Learn how to leverage AI for better customer insights."
        keywords="feedback analytics blog, AI insights, customer feedback tips, product updates, best practices"
        url="/blog"
        structuredData={breadcrumbSchema}
      />

      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {isAuthenticated && (
              <Button onClick={() => navigate('/blog/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Post
              </Button>
            )}
          </div>
          <h1 className="text-4xl font-bold mb-2">NoteX Blog</h1>
          <p className="text-muted-foreground">
            Insights, updates, and stories from the NoteX team
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6">
              <h3 className="font-semibold mb-4">Categories</h3>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`text-left p-3 rounded-lg transition-colors w-full ${
                  selectedCategory === 'all'
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <div className="font-medium">All Posts</div>
                <div className="text-sm opacity-70">{posts?.length || 0} posts</div>
              </button>
              {categories?.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.slug)}
                  className={`text-left p-3 rounded-lg transition-colors w-full ${
                    selectedCategory === category.slug
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  <div className="font-medium">{category.name}</div>
                  <div className="text-sm opacity-70">
                    {posts?.filter(p => p.blog_categories?.slug === category.slug).length || 0} posts
                  </div>
                </button>
              ))}

              <div className="mt-6">
                <h3 className="font-semibold mb-4">Popular Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {['AI', 'Analytics', 'Customer Feedback', 'Best Practices'].map((tag) => (
                    <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <div className="space-y-12">
              {featuredPosts.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Featured Articles</h2>
                  <div className="grid gap-6 md:grid-cols-2">
                    {featuredPosts.slice(0, 2).map((post) => (
                      <BlogPostCard key={post.id} post={post} />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-2xl font-bold mb-6">Latest Posts</h2>
                {filteredPosts.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredPosts.map((post) => (
                      <BlogPostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center">
                    <p className="text-muted-foreground">No articles found matching your criteria.</p>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 bg-card p-8 rounded-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Subscribe to our Newsletter</h2>
          <p className="text-muted-foreground mb-6">
            Get the latest blog posts and updates delivered to your inbox
          </p>
          <div className="flex gap-4 max-w-md mx-auto">
            <Input type="email" placeholder="Enter your email" />
            <Button>Subscribe</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;
