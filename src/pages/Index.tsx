import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/sections/HeroSection";
import FeaturesSection from "@/components/sections/FeaturesSection";
import HowItWorksSection from "@/components/sections/HowItWorksSection";
import PricingSection from "@/components/sections/PricingSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import CTASection from "@/components/sections/CTASection";
import ErrorBoundary from "@/components/ErrorBoundary";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <ErrorBoundary>
        <Header />
      </ErrorBoundary>
      <main>
        <ErrorBoundary>
          <HeroSection />
        </ErrorBoundary>
        <ErrorBoundary>
          <FeaturesSection />
        </ErrorBoundary>
        <ErrorBoundary>
          <HowItWorksSection />
        </ErrorBoundary>
        <ErrorBoundary>
          <CTASection />
        </ErrorBoundary>
        <ErrorBoundary>
          <PricingSection />
        </ErrorBoundary>
        <ErrorBoundary>
          <TestimonialsSection />
        </ErrorBoundary>
      </main>
      <ErrorBoundary>
        <Footer />
      </ErrorBoundary>
    </div>
  );
};

export default Index;
