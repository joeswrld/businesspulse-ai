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
        "Feedback Collection → Up to 50 responses",
        "AI Sentiment Analysis → Basic insights (3 themes)",
        "Team Members → 1 user (owner only)",
        "Reports → 1 basic report",
        "Analytics → Basic sentiment dashboard",
        "Widget Customization → Standard colors only",
        "Export Data → CSV format",
        "Email Support → Community forum access",
        "Data Retention → 30 days",
        "API Calls → 100 requests/month",
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
        "Feedback Collection → Up to 2,000 responses/month",
        "AI Sentiment Analysis → Advanced insights (10 themes)",
        "Team Members → Up to 10 users",
        "Reports → Up to 20 reports/month",
        "Analytics → Advanced sentiment dashboard",
        "Widget Customization → Full branding control",
        "Export Data → CSV, PDF, Excel formats",
        "Priority Support → Email & chat support",
        "Custom Integrations → Basic API access",
        "Advanced Analytics → Trend detection & predictions",
        "Data Retention → 12 months",
        "API Calls → 5,000 requests/month",
        "Automated Workflows → Basic automation",
        "Slack/Teams Integration → Basic notifications",
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
        "AI Sentiment Analysis → Enterprise-grade insights (unlimited themes)",
        "Team Members → Unlimited with role-based access",
        "Reports → Unlimited reports with advanced analytics",
        "Analytics → Enterprise sentiment dashboard",
        "Everything in Pro",
        "White-label widgets → Brand as your own",
        "Predictive analytics → AI-powered trend projection",
        "Automated alerts → Slack, Teams, Email, SMS",
        "Dedicated support & SLA → 4-hour response time",
        "Compliance → GDPR, SOC2, HIPAA ready",
        "Custom integrations & webhooks → Unlimited",
        "Data Retention → Unlimited",
        "API Calls → Unlimited",
        "Advanced Security → SSO, 2FA, IP restrictions",
        "Custom AI Models → Train on your data",
        "Multi-language Support → 50+ languages",
        "Advanced Segmentation → Customer cohorts & personas",
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
            Start with our 8-day free trial to experience AI-powered feedback analytics, then choose a plan that scales with your business needs. From startups to enterprises, we have the perfect plan for you.
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

        {/* Feature Comparison Table */}
        <div className="mt-16">
          <div className="bg-muted/30 rounded-2xl p-6 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-bold text-center mb-6">
              Feature Comparison
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Features</th>
                    <th className="text-center py-3 px-4 font-semibold">Free Trial</th>
                    <th className="text-center py-3 px-4 font-semibold">Pro</th>
                    <th className="text-center py-3 px-4 font-semibold">Business</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-3 px-4 font-medium">Feedback Responses</td>
                    <td className="text-center py-3 px-4">50</td>
                    <td className="text-center py-3 px-4">2,000/month</td>
                    <td className="text-center py-3 px-4">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">AI Themes</td>
                    <td className="text-center py-3 px-4">3</td>
                    <td className="text-center py-3 px-4">10</td>
                    <td className="text-center py-3 px-4">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Team Members</td>
                    <td className="text-center py-3 px-4">1</td>
                    <td className="text-center py-3 px-4">10</td>
                    <td className="text-center py-3 px-4">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Reports</td>
                    <td className="text-center py-3 px-4">1</td>
                    <td className="text-center py-3 px-4">20/month</td>
                    <td className="text-center py-3 px-4">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium">Data Retention</td>
                    <td className="text-center py-3 px-4">30 days</td>
                    <td className="text-center py-3 px-4">12 months</td>
                    <td className="text-center py-3 px-4">Unlimited</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-muted/50 rounded-2xl p-8">
            <h3 className="text-xl font-bold mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-muted-foreground mb-6">
              Join hundreds of businesses already using NoteX to understand their customers better.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" asChild>
                <Link to="/auth">Start Your Free Trial ✨</Link>
              </Button>
              <Button variant="outline" size="lg">
                Schedule Demo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;