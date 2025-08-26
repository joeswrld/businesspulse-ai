import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Download, 
  Star,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";

const Templates = () => {
  const templates = [
    {
      title: "Basic Feedback Widget",
      description: "Simple feedback collection widget for websites",
      category: "Widget",
      popular: true
    },
    {
      title: "Customer Satisfaction Survey",
      description: "Comprehensive customer satisfaction survey template",
      category: "Survey",
      popular: false
    },
    {
      title: "Product Feedback Form",
      description: "Detailed product feedback collection form",
      category: "Form",
      popular: true
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
              Templates
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              NoteX{" "}
              <span className="gradient-text">Templates</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Ready-to-use templates to help you get started quickly with feedback collection.
            </p>
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="container mx-auto px-4 py-16">
        <div className="space-y-6">
          {templates.map((template, index) => (
            <Card key={index} className="hover:shadow-medium transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <Badge variant="secondary">{template.category}</Badge>
                      {template.popular && (
                        <Badge variant="default" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-xl mb-2">{template.title}</h3>
                    <p className="text-muted-foreground mb-3">{template.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Need Custom Templates?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Can't find the template you need? Contact us for custom template development.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">
              Request Custom Template
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

export default Templates;