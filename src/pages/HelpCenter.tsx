import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Search, 
  HelpCircle, 
  MessageSquare, 
  BookOpen,
  Video,
  Mail,
  Phone,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Play,
  FileText,
  Settings,
  Zap
} from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { generateFAQSchema, generateBreadcrumbSchema } from "@/utils/structuredData";

const HelpCenter = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const categories = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: Zap,
      articles: [
        {
          title: "How to set up your first feedback widget",
          description: "Step-by-step guide to embedding your first feedback widget on your website",
          readTime: "5 min read",
          popular: true
        },
        {
          title: "Creating your first project",
          description: "Learn how to create and configure your first feedback project",
          readTime: "3 min read",
          popular: false
        },
        {
          title: "Understanding your dashboard",
          description: "Navigate your dashboard and understand key metrics",
          readTime: "4 min read",
          popular: true
        }
      ]
    },
    {
      id: "widgets",
      title: "Widgets & Integration",
      icon: Settings,
      articles: [
        {
          title: "Customizing your feedback widget",
          description: "Learn how to customize colors, text, and behavior of your widget",
          readTime: "6 min read",
          popular: false
        },
        {
          title: "Integrating with your website",
          description: "Complete integration guide for different platforms and frameworks",
          readTime: "8 min read",
          popular: true
        },
        {
          title: "Mobile app integration",
          description: "How to integrate feedback collection in your mobile app",
          readTime: "7 min read",
          popular: false
        }
      ]
    },
    {
      id: "analytics",
      title: "Analytics & Insights",
      icon: BookOpen,
      articles: [
        {
          title: "Understanding sentiment analysis",
          description: "Learn how our AI analyzes customer sentiment and emotions",
          readTime: "5 min read",
          popular: true
        },
        {
          title: "Creating custom reports",
          description: "Build custom reports to track specific metrics and trends",
          readTime: "6 min read",
          popular: false
        },
        {
          title: "Exporting your data",
          description: "Export feedback data in various formats for external analysis",
          readTime: "3 min read",
          popular: false
        }
      ]
    },
    {
      id: "billing",
      title: "Billing & Account",
      icon: FileText,
      articles: [
        {
          title: "Understanding your billing plan",
          description: "Learn about different plans and what's included in each",
          readTime: "4 min read",
          popular: false
        },
        {
          title: "Upgrading your plan",
          description: "How to upgrade your plan and what happens to your data",
          readTime: "3 min read",
          popular: false
        },
        {
          title: "Managing team members",
          description: "Add, remove, and manage team member access and permissions",
          readTime: "5 min read",
          popular: true
        }
      ]
    }
  ];

  const popularArticles = [
    {
      title: "How to set up your first feedback widget",
      category: "Getting Started",
      readTime: "5 min read",
      views: "2.3k"
    },
    {
      title: "Understanding sentiment analysis",
      category: "Analytics",
      readTime: "5 min read",
      views: "1.8k"
    },
    {
      title: "Customizing your feedback widget",
      category: "Widgets",
      readTime: "6 min read",
      views: "1.5k"
    },
    {
      title: "Integrating with your website",
      category: "Widgets",
      readTime: "8 min read",
      views: "1.2k"
    }
  ];

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help via email within 24 hours",
      action: "Send Email",
      href: "mailto:admin@notex.com.ng"
    },
    {
      icon: MessageSquare,
      title: "Live Chat",
      description: "Chat with our support team in real-time",
      action: "Start Chat",
      href: "#"
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Call us for urgent issues (Business plan)",
      action: "Call Now",
      href: "tel:+2349135375819"
    }
  ];

  const filteredCategories = categories.map(category => ({
    ...category,
    articles: category.articles.filter(article =>
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.articles.length > 0);

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Help Center", url: "/help-center" },
  ];

  const faqData = [
    { question: "How do I set up my first feedback widget?", answer: "Follow our step-by-step guide to embed your first feedback widget on your website in minutes." },
    { question: "Can I customize the feedback forms?", answer: "Yes, you can fully customize feedback forms, colors, and questions to match your brand." },
    { question: "How does AI analysis work?", answer: "Our AI analyzes feedback sentiment, extracts key themes, and generates actionable insights automatically." },
  ];

  const structuredData = [
    generateBreadcrumbSchema(breadcrumbItems),
    generateFAQSchema(faqData),
  ];

  return (
    <>
      <SEO
        title="Help Center - NoteX Support & Documentation"
        description="Get help with NoteX AI feedback analytics platform. Browse guides, tutorials, and FAQs. Contact our support team for assistance with customer insights and analytics."
        keywords="notex help, feedback analytics support, customer support, help documentation, tutorials"
        url="/help-center"
        structuredData={structuredData}
      />
      <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r  ">
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
              Help Center
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              How Can We{" "}
              <span className="gradient-text">Help?</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Find answers to common questions, learn how to use NoteX effectively, 
              and get the support you need to succeed.
            </p>

            {/* Search */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for help articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-3 text-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Popular Articles */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold mb-8">Popular Articles</h2>
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          {popularArticles.map((article, index) => (
            <Card key={index} className="hover:shadow-medium transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>{article.category}</span>
                      <span>•</span>
                      <span>{article.readTime}</span>
                      <span>•</span>
                      <span>{article.views} views</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Categories */}
        <div className="space-y-8">
          {filteredCategories.map((category) => (
            <Card key={category.id} className="border-0 bg-background/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center">
                      <category.icon className="h-5 w-5 text-primary dark:text-primary-foreground " />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{category.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {category.articles.length} articles
                      </p>
                    </div>
                  </div>
                  {expandedCategory === category.id ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {expandedCategory === category.id && (
                  <div className="mt-6 space-y-4">
                    {category.articles.map((article, index) => (
                      <div key={index} className="flex items-start space-x-4 p-4 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">{article.title}</h4>
                            {article.popular && (
                              <Badge variant="secondary" className="text-xs">Popular</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{article.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{article.readTime}</span>
                            <span>•</span>
                            <span>Click to read</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-6">Still Need Help?</h2>
            <p className="text-lg text-muted-foreground">
              Can't find what you're looking for? Our support team is here to help you succeed.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {contactMethods.map((method, index) => (
              <Card key={index} className="border-0 bg-background/80 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mx-auto mb-4">
                    <method.icon className="h-6 w-6 text-primary dark:text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{method.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{method.description}</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href={method.href}>{method.action}</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r   py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start collecting feedback today and see how NoteX can help you understand 
            your customers better and drive growth.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/signup">Start Your Free Trial ✨</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/testimonials">See Success Stories</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default HelpCenter;