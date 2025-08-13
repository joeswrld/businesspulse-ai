import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, Crown } from "lucide-react";

const PricingSection = () => {
  const plans = [
    {
      name: "Free Trial",
      price: "$0",
      period: "8 days",
      description: "Perfect for testing our platform",
      icon: Zap,
      badge: "Start Here",
      badgeVariant: "default" as const,
      features: [
        "AI-powered document analysis",
        "Basic dashboard & insights",
        "Up to 10 document uploads",
        "Standard email support",
        "Export to PDF/CSV",
        "Basic templates"
      ],
      buttonText: "Start Free Trial",
      buttonVariant: "hero" as const,
      popular: false
    },
    {
      name: "Pro",
      price: "$17",
      period: "/month",
      description: "For growing businesses and startups",
      icon: Star,
      badge: "Most Popular",
      badgeVariant: "default" as const,
      features: [
        "Everything in Free Trial",
        "Unlimited document uploads",
        "Advanced AI insights & recommendations",
        "Real-time data sync",
        "Team collaboration (up to 5 users)",
        "Industry-specific templates",
        "Priority email support",
        "Custom branding on reports",
        "API integrations"
      ],
      buttonText: "Get Started",
      buttonVariant: "default" as const,
      popular: true
    },
    {
      name: "Business",
      price: "$30",
      period: "/month",
      description: "For enterprises and larger teams",
      icon: Crown,
      badge: "Enterprise",
      badgeVariant: "secondary" as const,
      features: [
        "Everything in Pro",
        "Unlimited team members",
        "Advanced analytics & forecasting",
        "White-label reports",
        "Dedicated account manager",
        "Custom integrations",
        "24/7 phone & chat support",
        "Advanced security & compliance",
        "Custom AI model training",
        "SLA guarantee"
      ],
      buttonText: "Contact Sales",
      buttonVariant: "premium" as const,
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4">
            Simple Pricing
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Choose the Perfect Plan for{" "}
            <span className="gradient-text">Your Business</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Start with our 8-day free trial, then choose a plan that scales with your business. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative border-0 ${
                plan.popular
                  ? "bg-gradient-to-br from-primary-light to-secondary-light shadow-glow scale-105"
                  : "bg-background shadow-soft hover:shadow-medium"
              } transition-all duration-300`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge variant="default" className="bg-gradient-primary text-white px-4 py-1">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                {/* Icon */}
                <div className="w-12 h-12 mx-auto mb-4 bg-primary-light rounded-xl flex items-center justify-center">
                  <plan.icon className="h-6 w-6 text-primary" />
                </div>

                {/* Plan Name & Badge */}
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  {!plan.popular && (
                    <Badge variant={plan.badgeVariant} className="text-xs">
                      {plan.badge}
                    </Badge>
                  )}
                </div>

                {/* Price */}
                <div className="py-4">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {plan.description}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Features List */}
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <Check className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  variant={plan.buttonVariant}
                  size="lg"
                  className="w-full"
                >
                  {plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-muted/50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-4">
              All plans include our 30-day money-back guarantee
            </h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Not satisfied? Get a full refund within 30 days, no questions asked. We're confident you'll love NoteX.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" size="lg">
                Compare All Features
              </Button>
              <Button variant="ghost" size="lg">
                Talk to Sales
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;