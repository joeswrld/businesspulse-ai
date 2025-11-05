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
import SEO from "@/components/SEO";
import { generateOrganizationSchema, generateWebsiteSchema, generateSoftwareApplicationSchema } from "@/utils/structuredData";

const Index = () => {
  const structuredData = [
    generateOrganizationSchema(),
    generateWebsiteSchema(),
    generateSoftwareApplicationSchema(),
  ];

  return (
    <>
      <SEO
        title="NoteX - AI Feedback & Analytics Platform | Transform Customer Feedback Into Growth"
        description="Transform customer feedback into actionable insights with NoteX's AI-powered analytics platform. Real-time sentiment analysis, automated reporting, and intelligent insights. Trusted by 500+ businesses worldwide. Start your free trial today."
        keywords="AI feedback analytics, customer feedback software, sentiment analysis tool, feedback management platform, AI survey tool, customer insights platform, feedback automation, business intelligence, customer satisfaction analytics, real-time feedback, AI-powered insights"
        url="/"
        structuredData={structuredData}
      />
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
    </>
  );
};

export default Index;
