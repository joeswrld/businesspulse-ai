import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  SlidersHorizontal, 
  Palette, 
  Globe, 
  Bell, 
  Code, 
  Smartphone,
  Monitor,
  Zap,
  Shield,
  Settings,
  Eye,
  Download
} from "lucide-react";
import { toast } from "sonner";

const FeedbackSettings = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = () => {
    setIsSubscribed(true);
    toast.success("You'll be notified when Feedback Settings is available!", {
      description: "We'll send you an email as soon as the feature launches.",
    });
  };

  const customizationFeatures = [
    {
      icon: Palette,
      title: "Brand Customization",
      description: "Match your widget colors, fonts, and styling to your brand identity",
      features: ["Custom color schemes", "Brand logo integration", "Typography options", "Border styling"]
    },
    {
      icon: Globe,
      title: "Multi-language Support",
      description: "Display your feedback widget in multiple languages for global audiences",
      features: ["Auto-detection", "Manual language selection", "RTL support", "Custom translations"]
    },
    {
      icon: Smartphone,
      title: "Mobile Optimization",
      description: "Perfect widget experience across all devices and screen sizes",
      features: ["Responsive design", "Touch-friendly interface", "Mobile-specific layouts", "Performance optimization"]
    }
  ];

  const integrationFeatures = [
    {
      icon: Code,
      title: "Easy Integration",
      description: "Simple one-line code snippet to add feedback to any website",
      features: ["Copy-paste installation", "No coding required", "Multiple platform support", "Instant activation"]
    },
    {
      icon: Monitor,
      title: "Platform Support",
      description: "Works seamlessly with all major website platforms and frameworks",
      features: ["WordPress", "Shopify", "Wix", "Custom websites", "React/Vue/Angular"]
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description: "Changes to settings apply instantly without website downtime",
      features: ["Live preview", "Instant deployment", "A/B testing", "Version control"]
    }
  ];

  const notificationFeatures = [
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Get notified about important feedback and customer interactions",
      features: ["Email alerts", "Slack integration", "SMS notifications", "Custom webhooks"]
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "Enterprise-grade security and privacy controls for your data",
      features: ["GDPR compliance", "Data encryption", "Access controls", "Audit logs"]
    },
    {
      icon: Eye,
      title: "Analytics & Insights",
      description: "Detailed analytics to understand feedback patterns and trends",
      features: ["Response rates", "Sentiment tracking", "User behavior", "Performance metrics"]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mr-4">
            <SlidersHorizontal className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Feedback Settings</h1>
            <Badge variant="secondary" className="mt-2">
              Coming Soon
            </Badge>
          </div>
        </div>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Customize your feedback widget, configure notifications, and integrate with your existing tools. 
          Complete control over your feedback collection experience.
        </p>
      </div>

      {/* Coming Soon Card */}
      <Card className="max-w-2xl mx-auto mb-12 border-2 border-dashed border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-purple-900">⚙️ Advanced Settings Coming Soon!</CardTitle>
          <CardDescription className="text-lg">
            Powerful customization and integration options to make feedback collection work perfectly for your business.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Design Complete
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              Development in Progress
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-gray-300 rounded-full mr-2"></div>
              Testing
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-2">Estimated Launch</h3>
            <p className="text-2xl font-bold text-purple-600">Q1 2024</p>
            <p className="text-sm text-gray-500 mt-1">Be among the first to customize your feedback experience!</p>
          </div>

          {!isSubscribed ? (
            <Button 
              onClick={handleSubscribe}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3"
            >
              Get Early Access
            </Button>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">✅ You're on the list!</p>
              <p className="text-green-600 text-sm">We'll notify you as soon as Feedback Settings is available.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Tabs Preview */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Complete Control Over Your Feedback Experience
        </h2>
        
        <Tabs defaultValue="customization" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="customization" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Customization
            </TabsTrigger>
            <TabsTrigger value="integration" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Integration
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customization" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {customizationFeatures.map((feature, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="p-3 bg-purple-50 rounded-lg w-fit">
                      <feature.icon className="h-6 w-6 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.features.map((item, idx) => (
                        <li key={idx} className="flex items-center text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-2"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="integration" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {integrationFeatures.map((feature, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="p-3 bg-blue-50 rounded-lg w-fit">
                      <feature.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.features.map((item, idx) => (
                        <li key={idx} className="flex items-center text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {notificationFeatures.map((feature, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="p-3 bg-green-50 rounded-lg w-fit">
                      <feature.icon className="h-6 w-6 text-green-600" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.features.map((item, idx) => (
                        <li key={idx} className="flex items-center text-sm text-gray-600">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Advanced Features Preview */}
      <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-2xl p-8 mb-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Advanced Features for Power Users
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-white rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Download className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Export Options</h3>
            <p className="text-gray-600 text-sm">
              Export feedback data in multiple formats for analysis and reporting.
            </p>
          </div>
          <div className="text-center">
            <div className="bg-white rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Settings className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">API Access</h3>
            <p className="text-gray-600 text-sm">
              Full REST API access for custom integrations and automation.
            </p>
          </div>
          <div className="text-center">
            <div className="bg-white rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Enterprise Security</h3>
            <p className="text-gray-600 text-sm">
              Advanced security features for enterprise-grade deployments.
            </p>
          </div>
          <div className="text-center">
            <div className="bg-white rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Eye className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
            <p className="text-gray-600 text-sm">
              Comprehensive analytics and insights for data-driven decisions.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center">
        <Card className="max-w-2xl mx-auto bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <CardHeader>
            <CardTitle className="text-2xl">Ready to Customize Your Feedback Experience?</CardTitle>
            <CardDescription className="text-purple-100">
              Join the waitlist and be the first to access advanced feedback settings and customization options.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="secondary" 
              size="lg"
              onClick={handleSubscribe}
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              Join the Waitlist
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeedbackSettings;