import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, Crown } from "lucide-react";

const PricingSection = () => {
  const plans = [
    {
      name: "Free Trial",
      price: "₦0",
      period: "8 days",
      description: "Perfect for testing our feedback platform",
      icon: Zap,
      badge: "Start Here",
      badgeVariant: "default" as const,
      features: [
        "Feedback Collection → up to 100 responses",
        "AI Sentiment Analysis → Basic insights",
        "Team Members → 1 user (owner only)",
        "Reports → 2 basic reports",
        "Analytics → Basic sentiment dashboard",
        "Widget Customization → Basic styling",
        "Export Data → CSV format",
        "Email Support → Basic support",
      ],
      buttonText: "Start Free Trial",
      buttonVariant: "hero" as const,
      popular: false
    },
    {
      name: "Pro",
      price: "₦35,000",
      period: "/month",
      description: "For growing businesses and startups",
      icon: Star,
      badge: "Most Popular",
      badgeVariant: "default" as const,
      features: [
        "Feedback Collection → Unlimited responses",
        "AI Sentiment Analysis → Advanced insights & trends",
        "Team Members → up to 5 users",
        "Reports → Unlimited reports with trends",
        "Analytics → Advanced sentiment dashboard",
        "Widget Customization → Full branding control",
        "Export Data → CSV, PDF, Excel formats",
        "Priority Support → Email & chat support",
        "Custom Integrations → API access",
        "Advanced Analytics → Trend detection & predictions",
      ],
      buttonText: "Start Free Trial",
      buttonVariant: "hero" as const,
      popular: true
    },
    {
      name: "Business",
      price: "₦53,000",
      period: "/month",
      description: "For enterprises and large teams",
      icon: Crown,
      badge: "Enterprise",
      badgeVariant: "secondary" as const,
      features: [
        "Feedback Collection → Unlimited responses",
        "AI Sentiment Analysis → Enterprise-grade insights",
        "Team Members → Unlimited with role-based access",
        "Reports → Unlimited with advanced analytics",
        "Analytics → Enterprise sentiment dashboard",
        "Everything in Pro",
        "White-label widgets (brand as your own)",
        "Predictive analytics (AI-powered trend projection)",
        "Automated alerts (Slack, Teams, Email)",
        "Dedicated support & SLA",
        "Compliance (GDPR, SOC2, HIPAA)",
        "Custom integrations & webhooks",
      ],
      buttonText: "Start Free Trial",
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
            Turn Customer Feedback Into{" "}
            <span className="gradient-text">Business Growth</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Start with our 8-day free trial to experience AI-powered feedback analytics, then choose a plan that scales with your customer satisfaction goals. No hidden fees, cancel anytime.
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
                <Button variant={plan.buttonVariant} size="lg"
                  className="w-full" asChild>
              <Link to="/auth">Start Free Trial</Link>
            </Button>
              </CardContent>
              
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-muted/50 rounded-2xl p-8">
           
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" size="lg">
                Compare All Features
              </Button>
              
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;