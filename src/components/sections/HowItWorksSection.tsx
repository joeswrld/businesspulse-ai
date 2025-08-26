import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Brain, 
  TrendingUp, 
  Zap,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { Link } from "react-router-dom";

const HowItWorksSection = () => {
  const steps = [
    {
      icon: MessageSquare,
      title: "1. Collect Feedback",
      description: "Embed our smart widget on your website or app. Customers can leave feedback instantly with just one click.",
      features: [
        "Easy widget integration",
        "Customizable design",
        "Mobile-friendly interface",
        "Multi-language support"
      ],
      badge: "Setup"
    },
    {
      icon: Brain,
      title: "2. AI Analysis",
      description: "Our AI instantly analyzes sentiment, identifies trends, and extracts actionable insights from every piece of feedback.",
      features: [
        "Real-time sentiment analysis",
        "Trend detection",
        "Keyword extraction",
        "Emotion classification"
      ],
      badge: "AI-Powered"
    },
    {
      icon: TrendingUp,
      title: "3. Get Insights",
      description: "View beautiful dashboards with actionable insights, trends, and recommendations to improve customer satisfaction.",
      features: [
        "Interactive dashboards",
        "Custom reports",
        "Export capabilities",
        "Team collaboration"
      ],
      badge: "Insights"
    },
    {
      icon: Zap,
      title: "4. Take Action",
      description: "Use the insights to make data-driven decisions, improve your product, and boost customer satisfaction.",
      features: [
        "Actionable recommendations",
        "Priority scoring",
        "Integration alerts",
        "Success tracking"
      ],
      badge: "Results"
    }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4">
            Simple 4-Step Process
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            How FeedbackFlow{" "}
            <span className="gradient-text">Works</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Get started in minutes and start collecting actionable customer feedback insights. Our simple 4-step process makes it easy to understand your customers better.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {steps.map((step, index) => (
            <Card key={index} className="group hover:shadow-medium transition-all duration-300 border-0 bg-background/80 backdrop-blur-sm relative">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Icon and Badge */}
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center group-hover:bg-primary-light/80 transition-colors">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {step.badge}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {step.description}
                    </p>
                    
                    {/* Features List */}
                    <ul className="space-y-2">
                      {step.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
              
              {/* Arrow for connection */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2 z-10">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <ArrowRight className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Demo Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 md:p-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                See NoteX in Action
              </h3>
              <p className="text-muted-foreground mb-6">
                Watch how easy it is to collect, analyze, and act on customer feedback with our AI-powered platform.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm">Setup in under 5 minutes</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm">Real-time AI analysis</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm">Beautiful insights dashboard</span>
                </div>
              </div>
              
              <div className="mt-8">
                <Button size="lg" asChild>
                  <Link to="/auth">Start Your Free Trial ✨</Link>
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-8 w-8 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-600">Interactive Demo</p>
                    <p className="text-xs text-gray-500 mt-1">Widget & Dashboard Preview</p>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-lg p-3 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;