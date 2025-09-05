import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Users, 
  Heart, 
  Zap, 
  Globe,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";

const Careers = () => {
  const openPositions = [
    {
      id: 1,
      title: "Senior Frontend Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
      experience: "5+ years",
      salary: "$120k - $160k",
      description: "Build beautiful, responsive user interfaces for our feedback analytics platform using React and TypeScript.",
      requirements: [
        "5+ years of experience with React, TypeScript, and modern frontend technologies",
        "Experience with state management (Redux, Zustand, or similar)",
        "Strong understanding of CSS, responsive design, and accessibility",
        "Experience with testing frameworks (Jest, React Testing Library)",
        "Excellent communication and collaboration skills"
      ],
      benefits: ["Remote work", "Flexible hours", "Health insurance", "401k matching", "Unlimited PTO"]
    },
    {
      id: 2,
      title: "Product Manager",
      department: "Product",
      location: "San Francisco, CA",
      type: "Full-time",
      experience: "3+ years",
      salary: "$130k - $170k",
      description: "Lead product strategy and execution for our feedback analytics platform, working closely with engineering and design teams.",
      requirements: [
        "3+ years of product management experience in SaaS or B2B products",
        "Strong analytical skills and data-driven decision making",
        "Experience with user research and customer development",
        "Excellent communication and stakeholder management skills",
        "Technical background or ability to work closely with engineering teams"
      ],
      benefits: ["Remote work", "Flexible hours", "Health insurance", "401k matching", "Unlimited PTO"]
    },
    {
      id: 3,
      title: "Customer Success Manager",
      department: "Customer Success",
      location: "Remote",
      type: "Full-time",
      experience: "2+ years",
      salary: "$80k - $110k",
      description: "Help customers succeed with NoteX by providing exceptional support and guidance.",
      requirements: [
        "2+ years of customer success or account management experience",
        "Strong communication and problem-solving skills",
        "Experience with SaaS products and customer onboarding",
        "Ability to work with technical and non-technical customers",
        "Passion for helping customers achieve their goals"
      ],
      benefits: ["Remote work", "Flexible hours", "Health insurance", "401k matching", "Unlimited PTO"]
    },
    {
      id: 4,
      title: "Data Scientist",
      department: "Data Science",
      location: "Remote",
      type: "Full-time",
      experience: "3+ years",
      salary: "$140k - $180k",
      description: "Develop and improve our AI-powered sentiment analysis and feedback insights algorithms.",
      requirements: [
        "3+ years of experience in machine learning and data science",
        "Strong Python skills and experience with ML frameworks (TensorFlow, PyTorch)",
        "Experience with NLP and sentiment analysis",
        "Strong statistical and analytical skills",
        "Experience with production ML systems"
      ],
      benefits: ["Remote work", "Flexible hours", "Health insurance", "401k matching", "Unlimited PTO"]
    }
  ];

  const values = [
    {
      icon: Heart,
      title: "Customer-First",
      description: "Everything we do is guided by what's best for our customers"
    },
    {
      icon: Zap,
      title: "Innovation",
      description: "We constantly push boundaries to deliver cutting-edge solutions"
    },
    {
      icon: Users,
      title: "Collaboration",
      description: "We believe the best results come from working together"
    },
    {
      icon: Globe,
      title: "Impact",
      description: "We're building tools that help businesses understand their customers better"
    }
  ];

  const benefits = [
    {
      icon: Globe,
      title: "Remote-First",
      description: "Work from anywhere in the world"
    },
    {
      icon: Clock,
      title: "Flexible Hours",
      description: "Work when you're most productive"
    },
    {
      icon: Heart,
      title: "Health Insurance",
      description: "Comprehensive health, dental, and vision coverage"
    },
    {
      icon: DollarSign,
      title: "Competitive Salary",
      description: "Above-market compensation with equity options"
    },
    {
      icon: Users,
      title: "Team Events",
      description: "Regular team building and social activities"
    },
    {
      icon: Zap,
      title: "Learning Budget",
      description: "Annual budget for courses, conferences, and books"
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
              Join Our Team
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Build the Future of{" "}
              <span className="gradient-text">Customer Feedback</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Join our mission to help businesses understand their customers better through AI-powered feedback analytics. 
              We're looking for passionate individuals who want to make a real impact.
            </p>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl font-bold mb-6">Our Values</h2>
          <p className="text-lg text-muted-foreground">
            These core values guide everything we do and every decision we make.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <Card key={index} className="border-0 bg-background/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mx-auto mb-4">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-6">Benefits & Perks</h2>
            <p className="text-lg text-muted-foreground">
              We take care of our team with comprehensive benefits and perks.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="border-0 bg-background/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center flex-shrink-0">
                      <benefit.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Open Positions */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl font-bold mb-6">Open Positions</h2>
          <p className="text-lg text-muted-foreground">
            Ready to join our team? Check out our current openings.
          </p>
        </div>
        
        <div className="space-y-6">
          {openPositions.map((position) => (
            <Card key={position.id} className="hover:shadow-medium transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-xl mb-2">{position.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {position.department}
                          </span>
                          <span className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {position.location}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {position.type}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="mb-2">
                          {position.experience}
                        </Badge>
                        <div className="text-sm font-medium text-green-600">
                          {position.salary}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground mb-4">{position.description}</p>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-2">Requirements</h4>
                        <ul className="space-y-1">
                          {position.requirements.map((req, index) => (
                            <li key={index} className="flex items-start space-x-2 text-sm text-muted-foreground">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Benefits</h4>
                        <div className="flex flex-wrap gap-1">
                          {position.benefits.map((benefit, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {benefit}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="lg:ml-6 lg:mt-0 mt-6">
                    <Button size="lg" className="w-full lg:w-auto">
                      Apply Now
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* General Application */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Don't See the Right Role?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              We're always looking for talented individuals to join our team. 
              Send us your resume and let us know how you can contribute to our mission.
            </p>
            <Button size="lg">
              Send General Application
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Join Us?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Be part of a team that's transforming how businesses understand their customers. 
            Apply today and help us build the future of feedback analytics.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">
              View All Positions
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/about">Learn More About Us</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Careers;