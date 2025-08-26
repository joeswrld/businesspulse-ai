import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Users, 
  MessageSquare, 
  Globe,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";

const Community = () => {
  const platforms = [
    {
      name: "Discord",
      description: "Join our Discord server for real-time discussions and support",
      members: "2.5k+",
      icon: MessageSquare,
      link: "#"
    },
    {
      name: "GitHub",
      description: "Open source contributions and issue tracking",
      members: "500+",
      icon: Globe,
      link: "#"
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
              Community
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Join Our{" "}
              <span className="gradient-text">Community</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Connect with other FeedbackFlow users, share experiences, and get help from the community.
            </p>
          </div>
        </div>
      </div>

      {/* Community Platforms */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          {platforms.map((platform, index) => (
            <Card key={index} className="hover:shadow-medium transition-all duration-300">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-4">
                  <platform.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-xl mb-2">{platform.name}</h3>
                <p className="text-muted-foreground mb-4">{platform.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{platform.members} members</Badge>
                  <Button>
                    Join
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Connect?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our community and connect with other FeedbackFlow users from around the world.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">
              Join Discord
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="outline" size="lg">
              Visit GitHub
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Community;