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
              {/* Main Demo Container */}
              <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-100">
                {/* Widget Preview */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">Feedback Widget</h4>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 font-medium">Live</span>
                    </div>
                  </div>
                  
                  {/* Widget Interface */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <MessageSquare className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">How are we doing?</span>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Rating Stars */}
                    <div className="flex items-center justify-center space-x-1 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} className="text-yellow-400 hover:text-yellow-500 transition-colors">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      ))}
                    </div>
                    
                    {/* Feedback Input */}
                    <div className="space-y-3">
                      <textarea 
                        placeholder="Tell us more about your experience..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={2}
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <label className="flex items-center space-x-2 text-xs text-gray-600">
                            <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span>Anonymous</span>
                          </label>
                        </div>
                        <button className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors">
                          Submit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Dashboard Preview */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">Live Dashboard</h4>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Real-time</span>
                    </div>
                  </div>
                  
                  {/* Dashboard Interface */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                        <div className="text-lg font-bold text-blue-600">4.2</div>
                        <div className="text-xs text-gray-600">Avg Rating</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                        <div className="text-lg font-bold text-green-600">87%</div>
                        <div className="text-xs text-gray-600">Satisfaction</div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                        <div className="text-lg font-bold text-purple-600">1.2k</div>
                        <div className="text-xs text-gray-600">Responses</div>
                      </div>
                    </div>
                    
                    {/* Sentiment Chart */}
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">Sentiment Trend</span>
                        <span className="text-xs text-green-600">↗ +12%</span>
                      </div>
                      <div className="flex items-end space-x-1 h-16">
                        {[60, 75, 65, 80, 85, 90, 87].map((height, index) => (
                          <div 
                            key={index}
                            className="flex-1 bg-gradient-to-t from-blue-500 to-blue-300 rounded-t"
                            style={{ height: `${height}%` }}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                        <span>Sun</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Notification */}
              <div className="absolute -top-3 -right-3 bg-white rounded-lg p-3 shadow-lg border border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-600">Live Demo</span>
                </div>
              </div>
              
              {/* Floating Stats */}
              <div className="absolute -bottom-3 -left-3 bg-white rounded-lg p-3 shadow-lg border border-gray-200">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">⚡</div>
                  <div className="text-xs text-gray-600">Real-time</div>
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