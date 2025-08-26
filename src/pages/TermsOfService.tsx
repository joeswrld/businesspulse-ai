import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  FileText, 
  Shield, 
  Users, 
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";

const TermsOfService = () => {
  const lastUpdated = "January 15, 2024";

  const sections = [
    {
      title: "Acceptance of Terms",
      content: [
        "By accessing and using FeedbackFlow, you accept and agree to be bound by the terms and provision of this agreement.",
        "If you do not agree to abide by the above, please do not use this service.",
        "These terms apply to all users of the site, including without limitation users who are browsers, vendors, customers, merchants, and/or contributors of content."
      ]
    },
    {
      title: "Use License",
      content: [
        "Permission is granted to temporarily download one copy of FeedbackFlow for personal, non-commercial transitory viewing only.",
        "This is the grant of a license, not a transfer of title, and under this license you may not:",
        "• Modify or copy the materials",
        "• Use the materials for any commercial purpose or for any public display",
        "• Attempt to reverse engineer any software contained in FeedbackFlow",
        "• Remove any copyright or other proprietary notations from the materials"
      ]
    },
    {
      title: "Service Description",
      content: [
        "FeedbackFlow provides AI-powered feedback analytics services including:",
        "• Customer feedback collection and analysis",
        "• Sentiment analysis and trend detection",
        "• Interactive dashboards and reporting",
        "• API access for integrations",
        "• Customer support and documentation"
      ]
    },
    {
      title: "User Accounts",
      content: [
        "You are responsible for maintaining the confidentiality of your account and password",
        "You agree to accept responsibility for all activities that occur under your account",
        "You must be at least 18 years old to use this service",
        "You agree to provide accurate and complete information when creating your account",
        "You are responsible for all content submitted through your account"
      ]
    },
    {
      title: "Payment Terms",
      content: [
        "Subscription fees are billed in advance on a monthly or annual basis",
        "All fees are non-refundable except as required by law",
        "We reserve the right to change our pricing with 30 days notice",
        "Late payments may result in service suspension",
        "Free trial periods are subject to our fair use policy"
      ]
    },
    {
      title: "Prohibited Uses",
      content: [
        "Using the service for any unlawful purpose or to solicit others to perform unlawful acts",
        "Violating any international, federal, provincial or state regulations, rules, laws, or local ordinances",
        "Infringing upon or violating our intellectual property rights or the intellectual property rights of others",
        "Harassing, abusing, insulting, harming, defaming, slandering, disparaging, intimidating, or discriminating",
        "Submitting false or misleading information",
        "Uploading viruses or any other type of malicious code"
      ]
    },
    {
      title: "Intellectual Property",
      content: [
        "The service and its original content, features, and functionality are owned by FeedbackFlow and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.",
        "You retain ownership of any content you submit to the service",
        "You grant us a license to use, store, and process your content to provide our services",
        "We may use anonymized, aggregated data for research and improvement purposes"
      ]
    },
    {
      title: "Limitation of Liability",
      content: [
        "In no event shall FeedbackFlow, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages",
        "Our total liability to you for any claims arising from the use of our service shall not exceed the amount you paid us in the 12 months preceding the claim",
        "Some jurisdictions do not allow the exclusion or limitation of liability for consequential or incidental damages"
      ]
    },
    {
      title: "Termination",
      content: [
        "We may terminate or suspend your account immediately, without prior notice, for any reason",
        "Upon termination, your right to use the service will cease immediately",
        "You may cancel your subscription at any time through your account settings",
        "We will retain your data for 30 days after cancellation, after which it may be permanently deleted"
      ]
    }
  ];

  const keyPoints = [
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with 99.9% uptime guarantee"
    },
    {
      icon: Users,
      title: "Fair Use Policy",
      description: "Reasonable usage limits to ensure quality service for all users"
    },
    {
      icon: FileText,
      title: "Clear Terms",
      description: "Transparent terms that protect both you and our platform"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-4 mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
          
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-4">
              Terms of Service
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Terms of{" "}
              <span className="gradient-text">Service</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              These terms govern your use of FeedbackFlow and outline the rights and responsibilities 
              of both you and our platform.
            </p>
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          </div>
        </div>
      </div>

      {/* Key Points */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {keyPoints.map((point, index) => (
            <Card key={index} className="border-0 bg-background/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mx-auto mb-4">
                  <point.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{point.title}</h3>
                <p className="text-sm text-muted-foreground">{point.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Terms Content */}
        <div className="max-w-4xl mx-auto space-y-12">
          {sections.map((section, index) => (
            <div key={index}>
              <h2 className="text-2xl font-bold mb-6">{section.title}</h2>
              <div className="space-y-4">
                {section.content.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8">
            <div className="flex items-start space-x-4">
              <AlertCircle className="h-6 w-6 text-yellow-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Important Notice</h3>
                <p className="text-yellow-700 mb-4">
                  By using FeedbackFlow, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. 
                  If you do not agree with any part of these terms, you should not use our service.
                </p>
                <p className="text-sm text-yellow-600">
                  These terms may be updated from time to time. We will notify you of any material changes by posting the new Terms of Service on this page.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-muted/30 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">Questions About These Terms?</h2>
            <p className="text-muted-foreground mb-6">
              If you have any questions about these Terms of Service, please contact our legal team.
            </p>
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Email:</strong> legal@feedbackflow.com
              </p>
              <p className="text-sm">
                <strong>Address:</strong> FeedbackFlow Inc., 123 Legal Street, Compliance City, CC 12345
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            By using FeedbackFlow, you agree to these terms. Start your free trial today and 
            experience the power of AI-powered feedback analytics.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth">Start Your Free Trial ✨</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/privacy-policy">View Privacy Policy</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;