import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Star, TrendingUp, Zap, Brain } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const HeroSection = () => {
  return (
    <section className="relative pt-20 pb-16 overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-subtle"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8 animate-fade-up">
            {/* Announcement Badge */}
            <Badge variant="secondary" className="w-fit px-4 py-2 text-sm font-medium">
              <Zap className="h-4 w-4 mr-2" />
              AI-Powered Business Intelligence Platform
            </Badge>

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Transform Your{" "}
                <span className="gradient-text">Business Data</span> Into
                Actionable Insights
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                NoteX automatically analyzes your company documents, feedback, and data to produce intelligent business insights, trends, and opportunities using advanced AI.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="lg" className="w-full sm:w-auto">
                Start 8-Day Free Trial
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <Play className="h-5 w-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4">
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                ))}
                <span className="text-sm text-muted-foreground ml-2">4.9/5 rating</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Trusted by 500+ businesses across US, Canada & Nigeria
              </div>
            </div>
          </div>

          {/* Right Column - Hero Image */}
          <div className="relative animate-fade-in">
            <div className="relative rounded-2xl overflow-hidden shadow-large hero-glow">
              <img
                src={heroImage}
                alt="NoteX AI Business Intelligence Dashboard"
                className="w-full h-auto object-cover"
              />
              
              {/* Floating Elements */}
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-medium">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  <div>
                    <div className="text-xs font-medium">Revenue Growth</div>
                    <div className="text-lg font-bold text-success">+24.5%</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-medium">
                <div className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-xs font-medium">AI Insights</div>
                    <div className="text-lg font-bold text-primary">Live</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-medium">
                <div className="text-xs font-medium text-center">
                  Real-time Business Analytics
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;