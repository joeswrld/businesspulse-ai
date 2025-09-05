import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  Clock, 
  User,
  Tag,
  Filter,
  ChevronDown,
  ChevronRight,
  BookOpen,
  TrendingUp,
  MessageSquare,
  Zap
} from "lucide-react";
import { Link } from "react-router-dom";

const Blog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "product-updates", label: "Product Updates" },
    { value: "customer-feedback", label: "Customer Feedback" },
    { value: "analytics", label: "Analytics & Insights" },
    { value: "best-practices", label: "Best Practices" },
    { value: "case-studies", label: "Case Studies" },
    { value: "tutorials", label: "Tutorials" }
  ];

  const blogPosts = [
    {
      id: 1,
      title: "How to Improve Customer Satisfaction with AI-Powered Feedback Analysis",
      excerpt: "Learn how businesses are using AI to analyze customer feedback and boost satisfaction scores by up to 40%.",
      author: "Sarah Johnson",
      authorImage: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face",
      date: "January 15, 2024",
      readTime: "8 min read",
      category: "best-practices",
      tags: ["Customer Satisfaction", "AI", "Analytics"],
      featured: true,
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop"
    },
    {
      id: 2,
      title: "New Sentiment Analysis Features: What's New in NoteX v2.1",
      excerpt: "Discover the latest improvements to our sentiment analysis engine and how they help you understand customer emotions better.",
      author: "Michael Chen",
      authorImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
      date: "January 12, 2024",
      readTime: "5 min read",
      category: "product-updates",
      tags: ["Product Updates", "Sentiment Analysis", "New Features"],
      featured: false,
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop"
    },
    {
      id: 3,
      title: "Case Study: How TechFlow Increased NPS Score from 45 to 78",
      excerpt: "A detailed look at how TechFlow used NoteX to transform their customer feedback strategy and achieve remarkable results.",
      author: "Emily Rodriguez",
      authorImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
      date: "January 10, 2024",
      readTime: "12 min read",
      category: "case-studies",
      tags: ["Case Study", "NPS", "Success Story"],
      featured: true,
      image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=200&fit=crop"
    },
    {
      id: 4,
      title: "5 Common Feedback Collection Mistakes and How to Avoid Them",
      excerpt: "Learn from the mistakes others have made and implement a feedback collection strategy that actually works.",
      author: "David Okafor",
      authorImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
      date: "January 8, 2024",
      readTime: "6 min read",
      category: "best-practices",
      tags: ["Best Practices", "Feedback Collection", "Tips"],
      featured: false,
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop"
    },
    {
      id: 5,
      title: "Understanding Customer Sentiment: A Complete Guide",
      excerpt: "Everything you need to know about customer sentiment analysis and how to use it to improve your business.",
      author: "Jennifer Kim",
      authorImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop&crop=face",
      date: "January 5, 2024",
      readTime: "10 min read",
      category: "analytics",
      tags: ["Sentiment Analysis", "Analytics", "Guide"],
      featured: false,
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop"
    },
    {
      id: 6,
      title: "Setting Up Your First Feedback Widget: Step-by-Step Tutorial",
      excerpt: "A comprehensive tutorial on how to set up and customize your first feedback widget with NoteX.",
      author: "Alex Thompson",
      authorImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face",
      date: "January 3, 2024",
      readTime: "7 min read",
      category: "tutorials",
      tags: ["Tutorial", "Widget Setup", "Getting Started"],
      featured: false,
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop"
    }
  ];

  const featuredPosts = blogPosts.filter(post => post.featured);
  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-4 mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
          
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-4">
              Blog & Insights
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              NoteX{" "}
              <span className="gradient-text">Blog</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Insights, tips, and stories about customer feedback, analytics, and building better products.
            </p>

            {/* Search */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3 text-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Featured Posts */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold mb-8">Featured Articles</h2>
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {featuredPosts.map((post) => (
            <Card key={post.id} className="hover:shadow-medium transition-all duration-300 cursor-pointer">
              <CardContent className="p-0">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
                <div className="p-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {categories.find(cat => cat.value === post.category)?.label}
                    </Badge>
                    {post.featured && (
                      <Badge variant="default" className="text-xs">Featured</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-xl mb-3 line-clamp-2">{post.title}</h3>
                  <p className="text-muted-foreground mb-4 line-clamp-3">{post.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={post.authorImage}
                        alt={post.author}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="text-sm font-medium">{post.author}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{post.date}</span>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Filters and Posts */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Filters */}
          <div className="md:w-64 space-y-6">
            <div>
              <h3 className="font-semibold mb-4">Categories</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === category.value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Popular Tags</h3>
              <div className="flex flex-wrap gap-2">
                {["Customer Feedback", "Analytics", "AI", "Best Practices", "Tutorials", "Case Studies"].map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Posts Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-semibold">
                {filteredPosts.length} Articles
              </h3>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>Filtered by category and search</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.filter(post => !post.featured).map((post) => (
                <Card key={post.id} className="hover:shadow-medium transition-all duration-300 cursor-pointer">
                  <CardContent className="p-0">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-40 object-cover rounded-t-lg"
                    />
                    <div className="p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {categories.find(cat => cat.value === post.category)?.label}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{post.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{post.readTime}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredPosts.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No articles found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or category filter.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Newsletter Signup */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Get the latest insights about customer feedback, product updates, and best practices delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                className="flex-1"
              />
              <Button>Subscribe</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              No spam, unsubscribe at any time.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start collecting feedback today and see how NoteX can help you understand 
            your customers better and drive growth.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth">Start Your Free Trial ✨</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/testimonials">See Success Stories</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;