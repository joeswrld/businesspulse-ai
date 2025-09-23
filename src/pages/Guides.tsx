import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  BookOpen, 
  Clock, 
  Star,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";

const Guides = () => {
  const guides = [
    {
      title: "Getting Started with NoteX",
      description: "Complete beginner's guide to setting up your first feedback widget",
      readTime: "10 min read",
      difficulty: "Beginner",
      popular: true
    },
    {
      title: "Advanced Widget Customization",
      description: "Learn how to customize your feedback widget to match your brand",
      readTime: "15 min read",
      difficulty: "Intermediate",
      popular: false
    },
    {
      title: "Integrating with React Applications",
      description: "Step-by-step guide to integrating NoteX with React apps",
      readTime: "12 min read",
      difficulty: "Intermediate",
      popular: true
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r  ">
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
              Guides & Tutorials
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              NoteX{" "}
              <span className="gradient-text">Guides</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Step-by-step guides and tutorials to help you get the most out of NoteX.
            </p>
          </div>
        </div>
      </div>

      {/* Guides */}
      <div className="container mx-auto px-4 py-16">
        <div className="space-y-6">
          {guides.map((guide, index) => (
            <Card key={index} className="hover:shadow-medium transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <Badge variant="secondary">{guide.difficulty}</Badge>
                      {guide.popular && (
                        <Badge variant="default" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-xl mb-2">{guide.title}</h3>
                    <p className="text-muted-foreground mb-3">{guide.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {guide.readTime}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r  py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Need More Help?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Can't find the guide you're looking for? Check out our help center or contact support.
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

export default Guides;