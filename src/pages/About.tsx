import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Users, 
  Target, 
  Heart, 
  Zap,
  Globe,
  Award,
  TrendingUp,
  MessageSquare,
  Brain,
  Shield,
  Star
} from "lucide-react";
import { Link } from "react-router-dom";

const About = () => {
  const stats = [
    { icon: Users, value: "500+", label: "Active Businesses" },
    { icon: MessageSquare, value: "1M+", label: "Feedback Responses" },
    { icon: Star, value: "4.9/5", label: "Customer Rating" },
    { icon: TrendingUp, value: "98%", label: "Trial Conversion" },
  ];

  const values = [
    {
      icon: Heart,
      title: "Customer-Centric",
      description: "We believe that understanding customers is the key to business success. Every feature we build is designed to help you serve your customers better."
    },
    {
      icon: Brain,
      title: "AI-Powered Innovation",
      description: "We leverage cutting-edge AI to transform raw feedback into actionable insights, making data-driven decisions easier than ever."
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "Your customers' privacy and your data security are our top priorities. We're GDPR compliant and use enterprise-grade security."
    },
    {
      icon: Zap,
      title: "Simplicity & Speed",
      description: "We believe powerful tools should be easy to use. Get started in minutes, not days, and see results immediately."
    }
  ];

  const team = [
    {
      name: "Sarah Johnson",
      role: "CEO & Co-founder",
      bio: "Former product leader at Google and Microsoft. Passionate about making customer feedback accessible to every business.",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Michael Chen",
      role: "CTO & Co-founder",
      bio: "AI/ML expert with 10+ years building scalable systems. Previously led engineering teams at Amazon and Stripe.",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Emily Rodriguez",
      role: "Head of Product",
      bio: "Customer experience specialist who believes every business deserves world-class feedback analytics.",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r   ">
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
              About NoteX
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Transforming Customer{" "}
              <span className="gradient-text">Feedback</span> Into Growth
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              We're on a mission to help businesses understand their customers better through AI-powered feedback analytics. 
              Every piece of feedback is an opportunity to improve, and we're here to make those opportunities visible.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                <stat.icon className="h-8 w-8 text-primary dark:text-primary-foreground" />
              </div>
              <div className="text-3xl font-bold gradient-text mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mission Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-lg text-muted-foreground mb-6">
              We believe that every business, regardless of size, deserves access to world-class customer feedback analytics. 
              Our mission is to democratize customer insights through AI-powered tools that are both powerful and easy to use.
            </p>
            <p className="text-lg text-muted-foreground mb-8">
              From startups to enterprises, we help companies turn customer feedback into actionable insights that drive growth, 
              improve products, and create better customer experiences.
            </p>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Globe className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Global Reach</span>
              </div>
              <div className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Trusted by 500+ Businesses</span>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br   rounded-2xl p-8">
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Customer-Focused</h3>
                  <p className="text-sm text-muted-foreground">Every decision we make is guided by what's best for your customers</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Growth-Driven</h3>
                  <p className="text-sm text-muted-foreground">We help you identify opportunities to grow and improve</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Brain className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">AI-Powered</h3>
                  <p className="text-sm text-muted-foreground">Leveraging cutting-edge AI to deliver insights faster</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-6">Our Values</h2>
            <p className="text-lg text-muted-foreground">
              These core values guide everything we do and every product we build.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="border-0 bg-background/80 backdrop-blur-sm">
                <CardContent className="p-6 text-center ">
                  <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mx-auto mb-4">
                    <value.icon className="h-6 w-6 text-primary dark:text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      

      {/* CTA Section */}
      <div className="bg-gradient-to-r   py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Join Us?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start your journey with NoteX today and see how AI-powered feedback analytics 
            can transform your business and help you understand your customers better.
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
  );
};

export default About;