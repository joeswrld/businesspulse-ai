import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  BookOpen, 
  Code, 
  Zap, 
  Search,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";

const Documentation = () => {
  const sections = [
    {
      title: "Getting Started",
      description: "Quick start guides and tutorials",
      items: [
        { name: "Quick Start Guide", href: "#" },
        { name: "Installation", href: "#" },
        { name: "First Widget", href: "#" },
        { name: "Basic Configuration", href: "#" }
      ]
    },
    {
      title: "API Reference",
      description: "Complete API documentation",
      items: [
        { name: "Authentication", href: "#" },
        { name: "Endpoints", href: "#" },
        { name: "Webhooks", href: "#" },
        { name: "SDKs", href: "#" }
      ]
    },
    {
      title: "Widgets & Integration",
      description: "Widget setup and customization",
      items: [
        { name: "Widget Setup", href: "#" },
        { name: "Customization", href: "#" },
        { name: "Mobile Integration", href: "#" },
        { name: "Advanced Features", href: "#" }
      ]
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
              Documentation
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              NoteX{" "}
              <span className="gradient-text">Documentation</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Complete guides, tutorials, and API reference for integrating NoteX into your applications.
            </p>
          </div>
        </div>
      </div>

      {/* Documentation Sections */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {sections.map((section, index) => (
            <Card key={index} className="hover:shadow-medium transition-all duration-300">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-xl mb-2">{section.title}</h3>
                <p className="text-muted-foreground mb-6">{section.description}</p>
                <div className="space-y-2">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer">
                      <span className="text-sm">{item.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Need Help?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/help">Visit Help Center</Link>
            </Button>
            <Button variant="outline" size="lg">
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;