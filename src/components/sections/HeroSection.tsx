
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Star, TrendingUp, Zap, Brain } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const HeroSection = () => {
  return (
    <section className="relative pt-16 sm:pt-20 pb-12 sm:pb-16 overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-subtle transition-colors"></div>
      
      <div className="container mx-auto px-3 sm:px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-6 sm:space-y-8 animate-fade-up">
            {/* Announcement Badge */}
            <Badge variant="secondary" className="w-fit px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">
              <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              AI-Powered Feedback Analytics Platform ✨
            </Badge>

            {/* Main Headline */}
            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-[1.2] sm:leading-tight">
                Your Clients Are <span className="gradient-text">Talking</span> — Hear Them
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-full sm:max-w-xl">
                Every message, complaint, and idea your customers share is a signal — but most businesses miss it. NoteX helps you capture and analyze client feedback in real time using AI, so you can fix issues faster, double satisfaction, and grow without guesswork.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button variant="hero" size="lg" className="w-full sm:w-auto" asChild>
                <Link to="/signup">Start Free — Hear Your Clients Clearly ✨ <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2" /></Link>
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pt-3 sm:pt-4">
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 sm:h-4 sm:w-4 fill-warning text-warning" />
                ))}
                <span className="text-xs sm:text-sm text-muted-foreground ml-2">4.9/5 rating</span>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                No credit card needed. Trusted by 500+ businesses to boost customer satisfaction 🚀
              </div>
            </div>
          </div>

          {/* Right Column - Hero Image */}
          <div className="relative animate-fade-in order-first lg:order-last">
            <div className="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-large hero-glow">
              <img
                src={heroImage}
                alt="NoteX AI Feedback Analytics Dashboard"
                className="w-full h-auto object-cover"
              />
              
              {/* Floating Elements */}
              <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-card/90 backdrop-blur-sm rounded-lg p-2 sm:p-3 shadow-medium border border-border">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                  <div>
                    <div className="text-xs font-medium">Sentiment Score</div>
                    <div className="text-sm sm:text-lg font-bold text-success">+87%</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-card/90 backdrop-blur-sm rounded-lg p-2 sm:p-3 shadow-medium border border-border">
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-primary dark:text-primary" />
                  <div>
                    <div className="text-xs font-medium">AI Insights</div>
                    <div className="text-sm sm:text-lg font-bold text-primary dark:text-primary">Live</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 bg-card/90 backdrop-blur-sm rounded-lg p-2 sm:p-3 shadow-medium border border-border">
                <div className="text-xs font-medium text-center">
                  Real-time Feedback Analytics
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
