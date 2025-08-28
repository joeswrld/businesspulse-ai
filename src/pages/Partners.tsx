import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Handshake, 
  Users, 
  Globe, 
  Zap,
  CheckCircle,
  ExternalLink,
  Star
} from "lucide-react";
import { Link } from "react-router-dom";

const Partners = () => {
  const partnerPrograms = [
    {
      title: "Technology Partners",
      description: "Integrate NoteX with your platform and earn revenue sharing",
      benefits: [
        "Revenue sharing up to 30%",
        "Technical support and documentation",
        "Co-marketing opportunities",
        "Dedicated partner manager"
      ],
      icon: Zap
    },
    {
      title: "Agency Partners",
      description: "Resell NoteX to your clients and earn commissions",
      benefits: [
        "Commission rates up to 25%",
        "White-label options available",
        "Training and certification",
        "Marketing materials and support"
      ],
      icon: Users
    },
    {
      title: "Channel Partners",
      description: "Distribute NoteX through your sales channels",
      benefits: [
        "Volume-based pricing discounts",
        "Sales enablement resources",
        "Deal registration protection",
        "Quarterly business reviews"
      ],
      icon: Globe
    }
  ];

  const currentPartners = [
    {
      name: "TechFlow Solutions",
      logo: "https://via.placeholder.com/120x60/2563EB/FFFFFF?text=TechFlow",
      category: "Technology Partner",
      description: "Leading CRM platform integrating NoteX for enhanced customer insights"
    },
    {
      name: "Digital Marketing Pro",
      logo: "https://via.placeholder.com/120x60/059669/FFFFFF?text=Digital+Pro",
      category: "Agency Partner",
      description: "Full-service digital agency helping clients implement feedback strategies"
    },
    {
      name: "CloudTech Systems",
      logo: "https://via.placeholder.com/120x60/7C3AED/FFFFFF?text=CloudTech",
      category: "Channel Partner",
      description: "Enterprise software distributor with global reach"
    },
    {
      name: "DataInsight Corp",
      logo: "https://via.placeholder.com/120x60/DC2626/FFFFFF?text=DataInsight",
      category: "Technology Partner",
      description: "Analytics platform providing comprehensive data solutions"
    }
  ];

  const benefits = [
    {
      icon: Star,
      title: "Revenue Growth",
      description: "Earn significant revenue through our partner programs"
    },
    {
      icon: Users,
      title: "Expanded Reach",
      description: "Access new markets and customer segments"
    },
    {
      icon: Zap,
      title: "Technical Support",
      description: "Get comprehensive technical and sales support"
    },
    {
      icon: Globe,
      title: "Global Network",
      description: "Join our network of successful partners worldwide"
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
              Partner Program
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Partner with{" "}
              <span className="gradient-text">NoteX</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Join our partner ecosystem and grow your business while helping customers 
              understand their feedback better with AI-powered analytics.
            </p>
          </div>
        </div>
      </div>

      {/* Partner Programs */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl font-bold mb-6">Partner Programs</h2>
          <p className="text-lg text-muted-foreground">
            Choose the partnership model that best fits your business and goals.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {partnerPrograms.map((program, index) => (
            <Card key={index} className="hover:shadow-medium transition-all duration-300">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-4">
                  <program.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-xl mb-3">{program.title}</h3>
                <p className="text-muted-foreground mb-6">{program.description}</p>
                <ul className="space-y-3 mb-6">
                  {program.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-start space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full">
                  Learn More
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Current Partners */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-6">Our Partners</h2>
            <p className="text-lg text-muted-foreground">
              Meet some of our trusted partners who are helping businesses succeed with NoteX.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {currentPartners.map((partner, index) => (
              <Card key={index} className="border-0 bg-background/80 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="w-full h-12 object-contain mb-4"
                  />
                  <h3 className="font-semibold text-lg mb-2">{partner.name}</h3>
                  <Badge variant="secondary" className="mb-3">
                    {partner.category}
                  </Badge>
                  <p className="text-sm text-muted-foreground">{partner.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl font-bold mb-6">Why Partner With Us?</h2>
          <p className="text-lg text-muted-foreground">
            Discover the benefits of joining our partner ecosystem.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <Card key={index} className="border-0 bg-background/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Application Process */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Become a Partner</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Ready to join our partner program? Here's how to get started.
              </p>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Apply</h3>
                    <p className="text-sm text-muted-foreground">
                      Submit your partnership application and tell us about your business.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Review</h3>
                    <p className="text-sm text-muted-foreground">
                      We'll review your application and schedule a call to discuss opportunities.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Onboard</h3>
                    <p className="text-sm text-muted-foreground">
                      Complete training and certification to become an official partner.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Grow</h3>
                    <p className="text-sm text-muted-foreground">
                      Start earning revenue and growing your business with NoteX.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8">
              <h3 className="font-semibold text-xl mb-4">Ready to Get Started?</h3>
              <p className="text-muted-foreground mb-6">
                Join our partner program and start earning revenue while helping businesses 
                understand their customers better.
              </p>
              <div className="space-y-4">
                <Button size="lg" className="w-full">
                  Apply Now
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
                <Button variant="outline" size="lg" className="w-full">
                  Download Partner Kit
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Partner?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our growing network of partners and help businesses transform their 
            customer feedback into actionable insights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">
              Apply for Partnership
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="outline" size="lg">
              Contact Partner Team
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Partners;