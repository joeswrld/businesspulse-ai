import { Brain, Zap, FileText, BarChart3, Users, Shield, Globe, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FeaturesSection = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Advanced AI automatically analyzes your business documents and data to extract meaningful insights and trends.",
      badge: "Core Feature"
    },
    {
      icon: Zap,
      title: "Real-time Insights",
      description: "Get instant business intelligence updates as soon as new data is uploaded or changes occur.",
      badge: "Live Updates"
    },
    {
      icon: FileText,
      title: "Multi-format Support",
      description: "Upload documents, CSVs, connect APIs, or input text directly. We handle all your data sources.",
      badge: "Flexible"
    },
    {
      icon: BarChart3,
      title: "Smart Dashboards",
      description: "Interactive dashboards that automatically organize and visualize your key business metrics.",
      badge: "Visual"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Share insights with your team, add comments, and make data-driven decisions together.",
      badge: "Teamwork"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level encryption, GDPR compliance, and secure data handling for peace of mind.",
      badge: "Secure"
    },
    {
      icon: Globe,
      title: "Industry-Specific",
      description: "Pre-built templates and recommendations tailored for different industries and business types.",
      badge: "Customized"
    },
    {
      icon: Download,
      title: "Export & Reports",
      description: "Generate beautiful PDF reports and export data in multiple formats for presentations.",
      badge: "Professional"
    }
  ];

  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4">
            Platform Features
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Everything You Need for{" "}
            <span className="gradient-text">Smarter Business Decisions</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Our comprehensive AI-powered platform gives you all the tools to transform your raw business data into actionable insights that drive growth.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-medium transition-all duration-300 border-0 bg-background/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Icon and Badge */}
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center group-hover:bg-primary-light/80 transition-colors">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {feature.badge}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-background rounded-2xl p-8 shadow-soft border">
            <h3 className="text-2xl font-bold mb-4">
              Ready to see NoteX in action?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join hundreds of businesses already using NoteX to make smarter, data-driven decisions every day.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="inline-flex items-center justify-center gap-2 h-11 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 bg-gradient-primary text-primary-foreground hover:shadow-glow transform hover:scale-105 shadow-medium">
                Start Your Free Trial
              </button>
              <button className="inline-flex items-center justify-center gap-2 h-11 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-soft">
                Schedule Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;