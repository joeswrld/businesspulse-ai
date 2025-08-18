import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle, Clock, Shield } from "lucide-react";

const CTASection = () => {
  const benefits = [
    {
      icon: Clock,
      text: "Set up in under 5 minutes"
    },
    {
      icon: Shield,
      text: "No credit card required"
    },
    {
      icon: CheckCircle,
      text: "Full access to all features"
    }
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-12 md:p-16 text-center text-white">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
          </div>

          <div className="relative z-10 max-w-4xl mx-auto space-y-8">
            {/* Badge */}
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
              Limited Time Offer
            </Badge>

            {/* Headline */}
            <h2 className="text-3xl md:text-5xl font-bold leading-tight">
              Ready to Transform Your Business with AI-Powered Insights?
            </h2>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
              Join hundreds of successful businesses using NoteX to make smarter decisions. Start your free trial today and see the difference AI can make.
            </p>

            {/* Benefits */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center space-x-2 text-white/90">
                  <benefit.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{benefit.text}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4" >
              <Button 
                size="xl" 
                className="bg-white text-primary hover:bg-white/90 shadow-large font-semibold"
              
                >
                Start Your 8-Day Free Trial
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-8 text-white/80">
              
              <div className="text-sm">
                ✓ Cancel anytime
              </div>
              <div className="text-sm">
                ✓ GDPR & SOC 2 compliant
              </div>
            </div>

            {/* Urgency */}
            <div className="pt-4">
              <p className="text-sm text-white/70">
                🔥🔥🔥 Over 50 businesses signed up this week
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;