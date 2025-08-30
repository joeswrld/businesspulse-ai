
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, Star, TrendingUp, Zap, Brain } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const HeroSection = () => {
  return (
    <section className="relative pt-16 sm:pt-20 pb-12 sm:pb-16 overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-subtle"></div>
      
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
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Turn Customer{" "}
                <span className="gradient-text">Feedback</span> Into
                Business Growth
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
                NoteX helps businesses collect, analyze, and act on customer feedback with AI-powered insights. Get real-time sentiment analysis, trend detection, and actionable recommendations to boost customer satisfaction and drive growth.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button variant="hero" size="lg" className="w-full sm:w-auto" asChild>
                <Link to="/auth">Start Collecting Feedback ✨ <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-2" /></Link>
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
                Trusted by 500+ businesses to boost customer satisfaction 🚀
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
              <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 sm:p-3 shadow-medium">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                  <div>
                    <div className="text-xs font-medium">Sentiment Score</div>
                    <div className="text-sm sm:text-lg font-bold text-success">+87%</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 sm:p-3 shadow-medium">
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <div>
                    <div className="text-xs font-medium">AI Insights</div>
                    <div className="text-sm sm:text-lg font-bold text-primary">Live</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-lg p-2 sm:p-3 shadow-medium">
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