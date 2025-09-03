import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Quote, ArrowLeft, Filter, Search } from "lucide-react";
import { Link } from "react-router-dom";

const Testimonials = () => {
  const [selectedIndustry, setSelectedIndustry] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "CEO",
      industry: "SaaS",
      content: "NoteX transformed how we understand our customers. The AI sentiment analysis helped us identify pain points we never knew existed, leading to a 40% increase in customer satisfaction.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Product Manager",
      industry: "E-commerce",
      content: "The real-time feedback analytics is a game-changer. We can now track customer sentiment live and make product adjustments instantly. Our NPS score grew from 45 to 78 in just 3 months.",
      rating: 5,
    },
    {
      name: "Emily Rodriguez",
      role: "Founder",
      industry: "Startup",
      content: "Finally, a feedback platform that speaks our language. The AI insights are spot-on, and the widget integration is so seamless our customers love using it.",
      rating: 5,
    },
    {
      name: "David Okafor",
      role: "Customer Success Manager",
      industry: "Enterprise",
      content: "The feedback collection is incredibly powerful. It processes customer responses in minutes and gives insights that would take our team days to discover manually.",
      rating: 5,
    },
    {
      name: "Jennifer Kim",
      role: "Marketing Director",
      industry: "Marketing",
      content: "NoteX's reports save us 15+ hours per week. The actionable insights help us create better campaigns and our customer retention improved by 35%.",
      rating: 5,
    },
    {
      name: "Alex Thompson",
      role: "Co-founder",
      industry: "SaaS",
      content: "The trial convinced us immediately. The AI-powered feedback analysis helped us optimize our product features and increase our customer satisfaction by 45%. Absolutely worth it.",
      rating: 5,
    },
    {
      name: "Lisa Wang",
      role: "UX Designer",
      industry: "Design",
      content: "The sentiment analysis feature is incredible. We can now understand exactly how users feel about our designs and iterate faster than ever before.",
      rating: 5,
    },
    {
      name: "Marcus Johnson",
      role: "Operations Director",
      industry: "Service",
      content: "NoteX helped us identify service gaps we didn't know existed. Our customer satisfaction scores improved by 60% in the first quarter.",
      rating: 5,
    },
    {
      name: "Sofia Martinez",
      role: "Head of Product",
      industry: "Mobile",
      content: "The real-time feedback widget is perfect for our mobile app. Users can give feedback instantly, and we get insights immediately. Game changer!",
      rating: 5,
    }
  ];

  const industries = [
    { value: "all", label: "All Industries" },
    { value: "SaaS", label: "SaaS" },
    { value: "E-commerce", label: "E-commerce" },
    { value: "Startup", label: "Startup" },
    { value: "Enterprise", label: "Enterprise" },
    { value: "Marketing", label: "Marketing" },
    { value: "Design", label: "Design" },
    { value: "Service", label: "Service" },
    { value: "Mobile", label: "Mobile" },
  ];

  const filteredTestimonials = testimonials.filter(testimonial => {
    const matchesIndustry = selectedIndustry === "all" || testimonial.industry === selectedIndustry;
    const matchesSearch = testimonial.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         testimonial.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         testimonial.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesIndustry && matchesSearch;
  });

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
              Customer Success Stories
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Trusted by Businesses{" "}
              <span className="gradient-text">Worldwide</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              See how businesses across different industries are using NoteX to understand their customers better and drive growth through actionable feedback insights.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">500+</div>
                <div className="text-sm text-muted-foreground">Active Businesses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">4.9/5</div>
                <div className="text-sm text-muted-foreground">Customer Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">1M+</div>
                <div className="text-sm text-muted-foreground">Feedback Responses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold gradient-text">98%</div>
                <div className="text-sm text-muted-foreground">Trial Conversion</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search testimonials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {industries.map((industry) => (
                <option key={industry.value} value={industry.value}>
                  {industry.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTestimonials.map((testimonial, index) => (
            <Card key={index} className="bg-background/80 backdrop-blur-sm border-0 shadow-soft hover:shadow-medium transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Quote Icon */}
                  <div className="w-10 h-10 bg-primary-light rounded-lg flex items-center justify-center group-hover:bg-primary-light/80 transition-colors">
                    <Quote className="h-5 w-5 text-primary" />
                  </div>

                  {/* Rating */}
                  <div className="flex items-center space-x-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>

                  {/* Content */}
                  <blockquote className="text-sm leading-relaxed text-muted-foreground">
                    "{testimonial.content}"
                  </blockquote>

                  {/* Author */}
                  <div className="flex items-center space-x-3 pt-2">
                    <div>
                      <div className="font-semibold text-sm">{testimonial.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {testimonial.role}  {testimonial.company}
                      </div>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {testimonial.industry}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTestimonials.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No testimonials found matching your criteria.</p>
          </div>
        )}

        {/* CTA Section */}
        <div className="text-center py-12 mt-12">
          <h3 className="text-2xl font-bold mb-4">Ready to join our success stories?</h3>
          <p className="text-muted-foreground mb-6">
            Start collecting feedback today and see how NoteX can transform your business.
          </p>
          <Button size="lg" asChild>
            <Link to="/auth">Start Your Free Trial ✨</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;