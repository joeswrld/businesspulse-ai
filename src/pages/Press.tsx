import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Calendar, 
  ExternalLink,
  Download,
  Mail,
  Users,
  TrendingUp,
  Globe
} from "lucide-react";
import { Link } from "react-router-dom";

const Press = () => {
  const pressReleases = [
    {
      id: 1,
      title: "NoteX Raises $10M Series A to Scale AI-Powered Feedback Analytics",
      date: "January 15, 2024",
      excerpt: "Funding will accelerate product development and expand global reach for customer feedback analytics platform.",
      category: "Funding"
    },
    {
      id: 2,
      title: "NoteX Launches Advanced Sentiment Analysis with 95% Accuracy",
      date: "January 10, 2024",
      excerpt: "New AI-powered sentiment analysis feature helps businesses understand customer emotions with unprecedented accuracy.",
      category: "Product Launch"
    },
    {
      id: 3,
      title: "NoteX Reaches 500+ Active Business Customers",
      date: "January 5, 2024",
      excerpt: "Milestone achievement demonstrates growing demand for AI-powered customer feedback analytics.",
      category: "Company News"
    }
  ];

  const mediaCoverage = [
    {
      id: 1,
      title: "How AI is Revolutionizing Customer Feedback Analysis",
      publication: "TechCrunch",
      date: "January 12, 2024",
      excerpt: "NoteX's innovative approach to customer feedback analytics is changing how businesses understand their customers.",
      link: "#"
    },
    {
      id: 2,
      title: "The Future of Customer Experience: AI-Powered Insights",
      publication: "Forbes",
      date: "January 8, 2024",
      excerpt: "NoteX CEO Sarah Johnson discusses the future of customer experience and AI-powered analytics.",
      link: "#"
    },
    {
      id: 3,
      title: "Startup Spotlight: NoteX's Mission to Democratize Customer Insights",
      publication: "VentureBeat",
      date: "January 3, 2024",
      excerpt: "A deep dive into NoteX's mission and how they're making customer feedback analytics accessible to all businesses.",
      link: "#"
    }
  ];

  const companyStats = [
    { label: "Active Customers", value: "500+" },
    { label: "Countries Served", value: "25+" },
    { label: "Feedback Responses", value: "1M+" },
    { label: "Team Members", value: "25+" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r ">
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
              Press & Media
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Press{" "}
              <span className="gradient-text">Resources</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Press releases, media coverage, and resources for journalists and media professionals.
            </p>
          </div>
        </div>
      </div>

      {/* Company Stats */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {companyStats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl font-bold gradient-text mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Press Releases */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8">Press Releases</h2>
        <div className="space-y-6">
          {pressReleases.map((release) => (
            <Card key={release.id} className="hover:shadow-medium transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <Badge variant="secondary">{release.category}</Badge>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1" />
                        {release.date}
                      </div>
                    </div>
                    <h3 className="font-semibold text-xl mb-3">{release.title}</h3>
                    <p className="text-muted-foreground mb-4">{release.excerpt}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Read More
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Media Coverage */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Media Coverage</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mediaCoverage.map((article) => (
              <Card key={article.id} className="hover:shadow-medium transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2 mb-3">
                    <Badge variant="outline" className="text-xs">{article.publication}</Badge>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {article.date}
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-3">{article.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{article.excerpt}</p>
                  <Button variant="ghost" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Read Article
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Press Kit */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">Press Kit</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Download our press kit for logos, product screenshots, executive bios, and company information.
            </p>
            <div className="space-y-4">
              <Button size="lg" className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Download Press Kit (PDF)
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Download Logos & Assets
              </Button>
            </div>
          </div>
          
          <div className="bg-gradient-to-br   rounded-2xl p-8">
            <h3 className="font-semibold text-lg mb-4">What's Included</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Company overview and mission</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Executive team bios and photos</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Product screenshots and demos</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">High-resolution logos and branding</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Key statistics and milestones</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Media Inquiries</h2>
            <p className="text-lg text-muted-foreground mb-8">
              For press inquiries, interview requests, or additional information, please contact our press team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg">
                <Mail className="h-4 w-4 mr-2" />
                Contact Press Team
              </Button>
              <Button variant="outline" size="lg">
                <ExternalLink className="h-4 w-4 mr-2" />
                Request Interview
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r   py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Follow us for the latest news, product updates, and insights about customer feedback analytics.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">
              Follow on Twitter
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="outline" size="lg">
              Subscribe to Newsletter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Press;