import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Code, 
  Zap, 
  Database, 
  Shield,
  Copy,
  CheckCircle,
  ExternalLink,
  Terminal,
  Globe,
  MessageSquare,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";

const API = () => {
  const endpoints = [
    {
      method: "GET",
      path: "/api/v1/feedbacks",
      description: "Retrieve all feedback for your project",
      category: "Feedbacks"
    },
    {
      method: "POST",
      path: "/api/v1/feedbacks",
      description: "Create a new feedback entry",
      category: "Feedbacks"
    },
    {
      method: "GET",
      path: "/api/v1/feedbacks/{id}",
      description: "Get a specific feedback by ID",
      category: "Feedbacks"
    },
    {
      method: "PUT",
      path: "/api/v1/feedbacks/{id}",
      description: "Update an existing feedback",
      category: "Feedbacks"
    },
    {
      method: "DELETE",
      path: "/api/v1/feedbacks/{id}",
      description: "Delete a feedback entry",
      category: "Feedbacks"
    },
    {
      method: "GET",
      path: "/api/v1/projects",
      description: "List all your projects",
      category: "Projects"
    },
    {
      method: "POST",
      path: "/api/v1/projects",
      description: "Create a new project",
      category: "Projects"
    },
    {
      method: "GET",
      path: "/api/v1/analytics/sentiment",
      description: "Get sentiment analysis data",
      category: "Analytics"
    },
    {
      method: "GET",
      path: "/api/v1/analytics/trends",
      description: "Get feedback trends and insights",
      category: "Analytics"
    },
    {
      method: "POST",
      path: "/api/v1/webhooks",
      description: "Create a webhook endpoint",
      category: "Webhooks"
    }
  ];

  const sdks = [
    {
      name: "JavaScript",
      description: "Official JavaScript SDK for browser and Node.js",
      version: "v2.1.0",
      popular: true,
      code: "npm install @notex/sdk"
    },
    {
      name: "Python",
      description: "Python SDK for server-side integration",
      version: "v1.8.0",
      popular: true,
      code: "pip install notex-sdk"
    },
    {
      name: "PHP",
      description: "PHP SDK for web applications",
      version: "v1.5.0",
      popular: false,
      code: "composer require notex/sdk"
    },
    {
      name: "Ruby",
      description: "Ruby gem for Ruby on Rails applications",
      version: "v1.3.0",
      popular: false,
      code: "gem install notex-sdk"
    },
    {
      name: "Go",
      description: "Go SDK for high-performance applications",
      version: "v1.2.0",
      popular: false,
      code: "go get github.com/notex/sdk"
    },
    {
      name: "Java",
      description: "Java SDK for enterprise applications",
      version: "v1.1.0",
      popular: false,
      code: "implementation 'com.notex:sdk:1.1.0'"
    }
  ];

  const features = [
    {
      icon: Shield,
      title: "Secure Authentication",
      description: "API key authentication with rate limiting and security best practices"
    },
    {
      icon: Zap,
      title: "Real-time Webhooks",
      description: "Get instant notifications when new feedback is received"
    },
    {
      icon: Database,
      title: "Comprehensive Data",
      description: "Access all feedback data, analytics, and insights via API"
    },
    {
      icon: Globe,
      title: "Global CDN",
      description: "Fast API responses with global content delivery network"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r   border-b ">
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
              API Documentation
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              NoteX{" "}
              <span className="gradient-text">API</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Build powerful integrations with our comprehensive REST API. 
              Access feedback data, analytics, and insights programmatically.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Start */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">Quick Start</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Get started with our API in minutes. Here's a simple example to retrieve your feedback data.
            </p>
            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Get your API key from the dashboard</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Install one of our SDKs or use REST directly</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Start making API calls to access your data</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link to="/auth">Get API Key</Link>
              </Button>
              <Button variant="outline" size="lg">
                View Full Documentation
              </Button>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm">JavaScript Example</span>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-slate-400">
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <pre className="text-slate-300 text-sm overflow-x-auto">
{`// Initialize the SDK
const notex = new NoteX({
  apiKey: 'your-api-key-here'
});

// Get all feedback
const feedbacks = await notex.feedbacks.list({
  projectId: 'your-project-id',
  limit: 10
});

// Create new feedback
const newFeedback = await notex.feedbacks.create({
  projectId: 'your-project-id',
  content: 'Great product!',
  rating: 5,
  category: 'general'
});

console.log(feedbacks);`}
            </pre>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-6">API Features</h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to build powerful integrations with NoteX.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 bg-background/80 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-6 w-6 text-primary dark:text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* SDKs */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl font-bold mb-6">Official SDKs</h2>
          <p className="text-lg text-muted-foreground">
            Use our official SDKs for your preferred programming language to get started quickly.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sdks.map((sdk, index) => (
            <Card key={index} className="hover:shadow-medium transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{sdk.name}</h3>
                    <p className="text-sm text-muted-foreground">{sdk.description}</p>
                  </div>
                  {sdk.popular && (
                    <Badge variant="secondary" className="text-xs">Popular</Badge>
                  )}
                </div>
                <div className="bg-slate-100 rounded-lg p-3 mb-4">
                  <code className="text-sm text-slate-700">{sdk.code}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">v{sdk.version}</span>
                  <Button variant="ghost" size="sm" className="h-6 px-2">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* API Endpoints */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-6">API Endpoints</h2>
            <p className="text-lg text-muted-foreground">
              Complete list of available API endpoints for accessing feedback data and analytics.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              {endpoints.map((endpoint, index) => (
                <Card key={index} className="border-0 bg-background/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Badge 
                          variant={
                            endpoint.method === "GET" ? "default" :
                            endpoint.method === "POST" ? "secondary" :
                            endpoint.method === "PUT" ? "outline" : "destructive"
                          }
                          className="w-16 text-center"
                        >
                          {endpoint.method}
                        </Badge>
                        <code className="text-sm font-mono  px-2 py-1 rounded">
                          {endpoint.path}
                        </code>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {endpoint.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {endpoint.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Webhooks */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">Webhooks</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Get real-time notifications when new feedback is received. 
              Configure webhooks to integrate with your existing systems.
            </p>
            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Instant notifications for new feedback</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Secure webhook signatures for verification</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Retry logic for failed deliveries</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Webhook management dashboard</span>
              </div>
            </div>
            <Button size="lg">
              Configure Webhooks
            </Button>
          </div>
          
          <div className="bg-slate-900 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm">Webhook Payload Example</span>
            </div>
            <pre className="text-slate-300 text-sm overflow-x-auto">
{`{
  "event": "feedback.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "fb_123456789",
    "projectId": "proj_abc123",
    "content": "Great product!",
    "rating": 5,
    "sentiment": "positive",
    "category": "general",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}`}
            </pre>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r  to-indigo-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start integrating NoteX into your applications today. 
            Get your API key and start building powerful feedback integrations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth">Get API Key ✨</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/help">View API Guides</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default API;