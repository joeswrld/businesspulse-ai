import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Quote } from "lucide-react";

const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "CEO",
      content: "NoteX transformed how we make business decisions. The AI insights helped us identify a 40% increase in customer satisfaction opportunities we never knew existed.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Operations Director",
      content: "The real-time analytics feature is a game-changer. We can now track our KPIs live and make adjustments instantly. Our revenue grew 25% in just 3 months.",
      rating: 5,
    },
    {
      name: "Emily Rodriguez",
      role: "Founder",
      content: "Finally, a BI tool that speaks our language. The industry-specific recommendations are spot-on, and the team collaboration features keep everyone aligned.",
      rating: 5,
    },
    {
      name: "David Okafor",
      role: "Business Analyst",
      content: "The document analysis AI is incredibly accurate. It processes our quarterly reports in minutes and gives insights that would take our team days to discover.",
      rating: 5,
    },
    {
      name: "Jennifer Kim",
      role: "Marketing Director",
      content: "NoteX's automated reports save us 15+ hours per week. The branded PDF exports look professional and impress our stakeholders every time.",
      rating: 5,
    },
    {
      name: "Alex Thompson",
      role: "Co-founder",
      content: "The trial convinced us immediately. The AI suggestions helped us optimize our pricing strategy and increase our conversion rate by 35%. Absolutely worth it.",
      rating: 5,
    }
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4">
            Customer Stories
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Trusted by Business Leaders{" "}
            <span className="gradient-text">Worldwide</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            See how companies across the US, Canada, and Nigeria are using NoteX to make smarter, data-driven decisions that accelerate their growth.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
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
                        {testimonial.role}
                      </div>
                      
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-16 grid md:grid-cols-4 gap-8 text-center">
          <div className="space-y-2">
            <div className="text-3xl font-bold gradient-text">500+</div>
            <div className="text-sm text-muted-foreground">Active Businesses</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold gradient-text">4.9/5</div>
            <div className="text-sm text-muted-foreground">Customer Rating</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold gradient-text">250k+</div>
            <div className="text-sm text-muted-foreground">Documents Analyzed</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold gradient-text">98%</div>
            <div className="text-sm text-muted-foreground">Trial Conversion</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;