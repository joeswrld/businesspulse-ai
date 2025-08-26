import { Link } from "react-router-dom";
import { Brain, Zap, FileText, BarChart3, Users, Shield, Globe, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const FeaturesSection = () => {
  const features = [
    {
      icon: Brain,
      title: "AI Sentiment Analysis",
      description: "Advanced AI analyzes customer feedback in real-time to understand emotions, sentiment trends, and customer satisfaction levels.",
      badge: "Core Feature"
    },
    {
      icon: Zap,
      title: "Real-time Feedback",
      description: "Collect and analyze customer feedback instantly as it comes in, with live sentiment tracking and trend detection.",
      badge: "Live Updates"
    },
    {
      icon: FileText,
      title: "Smart Widget Integration",
      description: "Embed our feedback widget anywhere on your website or app. Customizable, lightweight, and designed for maximum response rates.",
      badge: "Easy Setup"
    },
    {
      icon: BarChart3,
      title: "Insight Dashboards",
      description: "Beautiful, interactive dashboards that visualize customer sentiment, feedback trends, and actionable insights at a glance.",
      badge: "Visual"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Share feedback insights with your team, add notes, and collaborate on improving customer experience together.",
      badge: "Teamwork"
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "GDPR compliant, bank-level encryption, and secure data handling to protect your customers' privacy and your business.",
      badge: "Secure"
    },
    {
      icon: Globe,
      title: "Industry Insights",
      description: "Benchmark your feedback against industry standards and get tailored recommendations for your specific business vertical.",
      badge: "Smart"
    },
    {
      icon: Download,
      title: "Actionable Reports",
      description: "Generate comprehensive reports with actionable recommendations to improve customer satisfaction and drive business growth.",
      badge: "Professional"
    }
  ];

  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4">
            Feedback Analytics Features
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Everything You Need to{" "}
            <span className="gradient-text">Master Customer Feedback</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Our AI-powered feedback platform gives you all the tools to collect, analyze, and act on customer feedback to boost satisfaction and drive business growth.
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
              Ready to transform your customer feedback?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join hundreds of businesses already using NoteX to understand their customers better and drive growth through actionable insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/auth">Start Your Free Trial ✨</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;