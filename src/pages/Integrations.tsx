import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Zap, 
  Globe, 
  Code, 
  Smartphone,
  Monitor,
  MessageSquare,
  Mail,
  Calendar,
  Users,
  CheckCircle,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";

const Integrations = () => {
  const integrations = [
    {
      category: "Website Platforms",
      icon: Globe,
      integrations: [
        {
          name: "WordPress",
          description: "Seamlessly integrate feedback collection into your WordPress site",
          status: "Available",
          popular: true,
          logo: "https://via.placeholder.com/60x60/21759B/FFFFFF?text=WP"
        },
        {
          name: "Shopify",
          description: "Collect customer feedback directly from your Shopify store",
          status: "Available",
          popular: true,
          logo: "https://via.placeholder.com/60x60/95BF47/FFFFFF?text=SP"
        },
        {
          name: "Wix",
          description: "Easy integration with Wix websites and online stores",
          status: "Available",
          popular: false,
          logo: "https://via.placeholder.com/60x60/000000/FFFFFF?text=WX"
        },
        {
          name: "Squarespace",
          description: "Add feedback widgets to your Squarespace website",
          status: "Available",
          popular: false,
          logo: "https://via.placeholder.com/60x60/000000/FFFFFF?text=SS"
        }
      ]
    },
    {
      category: "Development Frameworks",
      icon: Code,
      integrations: [
        {
          name: "React",
          description: "React component library for easy integration",
          status: "Available",
          popular: true,
          logo: "https://via.placeholder.com/60x60/61DAFB/000000?text=RX"
        },
        {
          name: "Vue.js",
          description: "Vue.js plugin for feedback collection",
          status: "Available",
          popular: false,
          logo: "https://via.placeholder.com/60x60/4FC08D/FFFFFF?text=VU"
        },
        {
          name: "Angular",
          description: "Angular module for seamless integration",
          status: "Available",
          popular: false,
          logo: "https://via.placeholder.com/60x60/DD0031/FFFFFF?text=AN"
        },
        {
          name: "Node.js",
          description: "Server-side integration for Node.js applications",
          status: "Available",
          popular: true,
          logo: "https://via.placeholder.com/60x60/339933/FFFFFF?text=ND"
        }
      ]
    },
    {
      category: "Mobile Platforms",
      icon: Smartphone,
      integrations: [
        {
          name: "iOS (Swift)",
          description: "Native iOS SDK for mobile feedback collection",
          status: "Available",
          popular: true,
          logo: "https://via.placeholder.com/60x60/000000/FFFFFF?text=IO"
        },
        {
          name: "Android (Kotlin)",
          description: "Native Android SDK for mobile feedback collection",
          status: "Available",
          popular: true,
          logo: "https://via.placeholder.com/60x60/3DDC84/000000?text=AN"
        },
        {
          name: "React Native",
          description: "Cross-platform mobile integration",
          status: "Available",
          popular: false,
          logo: "https://via.placeholder.com/60x60/61DAFB/000000?text=RN"
        },
        {
          name: "Flutter",
          description: "Flutter plugin for mobile feedback collection",
          status: "Coming Soon",
          popular: false,
          logo: "https://via.placeholder.com/60x60/02569B/FFFFFF?text=FL"
        }
      ]
    },
    {
      category: "Communication Tools",
      icon: MessageSquare,
      integrations: [
        {
          name: "Slack",
          description: "Get feedback notifications directly in Slack",
          status: "Available",
          popular: true,
          logo: "https://via.placeholder.com/60x60/4A154B/FFFFFF?text=SL"
        },
        {
          name: "Microsoft Teams",
          description: "Integrate feedback alerts with Microsoft Teams",
          status: "Available",
          popular: false,
          logo: "https://via.placeholder.com/60x60/6264A7/FFFFFF?text=MS"
        },
        {
          name: "Discord",
          description: "Send feedback notifications to Discord channels",
          status: "Available",
          popular: false,
          logo: "https://via.placeholder.com/60x60/5865F2/FFFFFF?text=DC"
        },
        {
          name: "Email",
          description: "Email notifications for new feedback",
          status: "Available",
          popular: true,
          logo: "https://via.placeholder.com/60x60/EA4335/FFFFFF?text=EM"
        }
      ]
    },
    {
      category: "Analytics & CRM",
      icon: Monitor,
      integrations: [
        {
          name: "Google Analytics",
          description: "Track feedback alongside your analytics data",
          status: "Available",
          popular: true,
          logo: "https://via.placeholder.com/60x60/4285F4/FFFFFF?text=GA"
        },
        {
          name: "Salesforce",
          description: "Sync feedback data with Salesforce CRM",
          status: "Available",
          popular: true,
          logo: "https://via.placeholder.com/60x60/00A1E0/FFFFFF?text=SF"
        },
        {
          name: "HubSpot",
          description: "Integrate feedback with HubSpot CRM",
          status: "Available",
          popular: false,
          logo: "https://via.placeholder.com/60x60/FF7A59/FFFFFF?text=HS"
        },
        {
          name: "Zapier",
          description: "Connect FeedbackFlow with 5000+ apps via Zapier",
          status: "Available",
          popular: true,
          logo: "https://via.placeholder.com/60x60/FF4A00/FFFFFF?text=ZP"
        }
      ]
    }
  ];

  const comingSoon = [
    {
      name: "Notion",
      description: "Sync feedback data with Notion databases",
      logo: "https://via.placeholder.com/60x60/000000/FFFFFF?text=NO"
    },
    {
      name: "Airtable",
      description: "Export feedback to Airtable for custom workflows",
      logo: "https://via.placeholder.com/60x60/18BFFF/FFFFFF?text=AT"
    },
    {
      name: "Figma",
      description: "Collect design feedback directly in Figma",
      logo: "https://via.placeholder.com/60x60/F24E1E/FFFFFF?text=FI"
    },
    {
      name: "Linear",
      description: "Create issues from feedback automatically",
      logo: "https://via.placeholder.com/60x60/5E6AD2/FFFFFF?text=LN"
    }
  ];

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
              Integrations
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Connect NoteX{" "}
              <span className="gradient-text">Everywhere</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Integrate feedback collection into your existing tools and workflows. 
              From websites to mobile apps, we connect with the platforms you already use.
            </p>
          </div>
        </div>
      </div>

      {/* Integration Categories */}
      <div className="container mx-auto px-4 py-16">
        <div className="space-y-16">
          {integrations.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center">
                  <category.icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">{category.category}</h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {category.integrations.map((integration, index) => (
                  <Card key={index} className="hover:shadow-medium transition-all duration-300 group">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <img
                          src={integration.logo}
                          alt={integration.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-lg">{integration.name}</h3>
                            {integration.popular && (
                              <Badge variant="secondary" className="text-xs">Popular</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {integration.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <Badge 
                              variant={integration.status === "Available" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {integration.status}
                            </Badge>
                            {integration.status === "Available" && (
                              <Button variant="ghost" size="sm" className="h-6 px-2">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon Section */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-6">Coming Soon</h2>
            <p className="text-lg text-muted-foreground">
              We're constantly adding new integrations. Here's what we're working on next.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {comingSoon.map((integration, index) => (
              <Card key={index} className="border-0 bg-background/80 backdrop-blur-sm opacity-60">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <img
                      src={integration.logo}
                      alt={integration.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{integration.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {integration.description}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        Coming Soon
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* API Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">Custom Integrations</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Need a custom integration? Our powerful API allows you to build 
              integrations with any platform or service.
            </p>
            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>RESTful API with comprehensive documentation</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Webhook support for real-time data sync</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>SDKs for popular programming languages</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Developer support and technical assistance</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link to="/api">View API Documentation</Link>
              </Button>
              <Button variant="outline" size="lg">
                Contact Sales
              </Button>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8">
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Code className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">REST API</h3>
                  <p className="text-sm text-muted-foreground">Comprehensive REST API for all operations</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Webhooks</h3>
                  <p className="text-sm text-muted-foreground">Real-time notifications for new feedback</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">SDKs</h3>
                  <p className="text-sm text-muted-foreground">Official SDKs for JavaScript, Python, and more</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Integrate?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start collecting feedback today and integrate it with your favorite tools. 
            Get started with our free trial and see how easy integration can be.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth">Start Your Free Trial ✨</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/help">View Integration Guides</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Integrations;