import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Shield, 
  Settings, 
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";

const CookiePolicy = () => {
  const lastUpdated = "January 14, 2025";

  const cookieTypes = [
    {
      name: "Essential Cookies",
      description: "These cookies are necessary for the website to function properly",
      examples: ["Authentication", "Security", "Session management"],
      necessary: true
    },
    {
      name: "Analytics Cookies",
      description: "These cookies help us understand how visitors interact with our website",
      examples: ["Google Analytics", "Page views", "User behavior"],
      necessary: false
    },
    {
      name: "Functional Cookies",
      description: "These cookies enable enhanced functionality and personalization",
      examples: ["Language preferences", "User settings", "Customization"],
      necessary: false
    },
    {
      name: "Marketing Cookies",
      description: "These cookies are used to track visitors across websites for marketing purposes",
      examples: ["Advertising", "Social media", "Retargeting"],
      necessary: false
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r ">
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
              Cookie Policy
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Cookie{" "}
              <span className="gradient-text">Policy</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              This policy explains how NoteX uses cookies and similar technologies 
              to provide, protect, and improve our services.
            </p>
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          </div>
        </div>
      </div>

      {/* Cookie Types */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8">Types of Cookies We Use</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {cookieTypes.map((type, index) => (
            <Card key={index} className="border-0 bg-background/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-lg">{type.name}</h3>
                  {type.necessary && (
                    <Badge variant="default" className="text-xs">Necessary</Badge>
                  )}
                </div>
                <p className="text-muted-foreground mb-4">{type.description}</p>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Examples:</h4>
                  <ul className="space-y-1">
                    {type.examples.map((example, exampleIndex) => (
                      <li key={exampleIndex} className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>{example}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Cookie Management */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Managing Your Cookie Preferences</h2>
              <p className="text-lg text-muted-foreground mb-6">
                You have control over which cookies are stored on your device. 
                You can manage your preferences through your browser settings or our cookie consent tool.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start space-x-3">
                  <Settings className="h-5 w-5 text-primary  mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Browser Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Most browsers allow you to control cookies through their settings. 
                      You can block, delete, or manage cookies for specific websites.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Cookie Consent</h3>
                    <p className="text-sm text-muted-foreground">
                      Use our cookie consent tool to choose which types of cookies 
                      you want to allow on our website.
                    </p>
                  </div>
                </div>
              </div>
              <Button size="lg">
                Manage Cookie Preferences
              </Button>
            </div>
            
            <div className="bg-gradient-to-br   rounded-2xl p-8">
              <h3 className="font-semibold text-xl mb-4">Important Notice</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Essential Cookies</h4>
                    <p className="text-sm text-muted-foreground">
                      These cookies cannot be disabled as they are necessary for the website to function.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium">Optional Cookies</h4>
                    <p className="text-sm text-muted-foreground">
                      You can choose to disable analytics, functional, and marketing cookies.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Third-Party Cookies */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8">Third-Party Cookies</h2>
        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-muted-foreground mb-6">
            We may use third-party services that place cookies on your device. 
            These services help us provide better functionality and analytics.
          </p>
          
          <div className="space-y-6">
            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-3">Google Analytics</h3>
              <p className="text-muted-foreground mb-3">
                We use Google Analytics to understand how visitors use our website. 
                This helps us improve our services and user experience.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Data collected:</strong> Page views, user behavior, traffic sources
              </p>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-3">Customer Support Tools</h3>
              <p className="text-muted-foreground mb-3">
                We use customer support tools to provide better assistance to our users.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Data collected:</strong> Support interactions, chat sessions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Updates */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Policy Updates</h2>
            <p className="text-lg text-muted-foreground mb-6">
              We may update this Cookie Policy from time to time to reflect changes 
              in our practices or for other operational, legal, or regulatory reasons.
            </p>
            <p className="text-sm text-muted-foreground">
              We will notify you of any material changes by posting the new Cookie Policy 
              on this page and updating the "Last updated" date.
            </p>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Questions About Cookies?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            If you have any questions about our use of cookies, please contact us.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/privacy-policy">View Privacy Policy</Link>
            </Button>
            <Button variant="outline" size="lg">
              Contact Us
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;