import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Clock, Star, TrendingUp, Users, Zap } from "lucide-react";
import { toast } from "sonner";

const Feedback = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = () => {
    setIsSubscribed(true);
    toast.success("You'll be notified when Feedback is available!", {
      description: "We'll send you an email as soon as the feature launches.",
    });
  };

  const features = [
    {
      icon: MessageSquare,
      title: "Real-time Feedback Collection",
      description: "Collect feedback from website visitors instantly with customizable widgets",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: Star,
      title: "Sentiment Analysis",
      description: "Automatic analysis of feedback sentiment (positive/negative/neutral)",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      icon: TrendingUp,
      title: "Analytics Dashboard",
      description: "View feedback statistics, trends, and insights in real-time",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Assign feedback to team members and track resolution status",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      icon: Zap,
      title: "Smart Notifications",
      description: "Get notified of new feedback, negative sentiment, and urgent issues",
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      icon: Clock,
      title: "Response Management",
      description: "Track feedback status and manage customer responses efficiently",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mr-4">
            <MessageSquare className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Feedback Management</h1>
            <Badge variant="secondary" className="mt-2">
              Coming Soon
            </Badge>
          </div>
        </div>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Collect, analyze, and manage customer feedback in one powerful platform. 
          Transform customer insights into actionable business improvements.
        </p>
      </div>

      {/* Coming Soon Card */}
      <Card className="max-w-2xl mx-auto mb-12 border-2 border-dashed border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-blue-900">🚀 Launching Soon!</CardTitle>
          <CardDescription className="text-lg">
            We're working hard to bring you the most powerful feedback management system.
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
            <p className="text-2xl font-bold text-blue-600">Q1 2024</p>
            <p className="text-sm text-gray-500 mt-1">Be among the first to try it!</p>
          </div>

          {!isSubscribed ? (
            <Button 
              onClick={handleSubscribe}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3"
            >
              Get Early Access
            </Button>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">✅ You're on the list!</p>
              <p className="text-green-600 text-sm">We'll notify you as soon as Feedback is available.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Powerful Features Coming Your Way
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <div className={`p-3 rounded-lg ${feature.bgColor} w-fit`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 mb-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Why Choose Our Feedback System?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-white rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Increase Customer Satisfaction</h3>
            <p className="text-gray-600">
              Understand your customers better and improve your products and services based on real feedback.
            </p>
          </div>
          <div className="text-center">
            <div className="bg-white rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Zap className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Faster Response Times</h3>
            <p className="text-gray-600">
              Get instant notifications and respond to customer concerns before they become bigger issues.
            </p>
          </div>
          <div className="text-center">
            <div className="bg-white rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
            <p className="text-gray-600">
              Work together with your team to resolve feedback efficiently and improve customer experience.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center">
        <Card className="max-w-2xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardHeader>
            <CardTitle className="text-2xl">Ready to Transform Your Customer Feedback?</CardTitle>
            <CardDescription className="text-blue-100">
              Join the waitlist and be the first to experience the future of feedback management.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="secondary" 
              size="lg"
              onClick={handleSubscribe}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              Join the Waitlist
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Feedback;