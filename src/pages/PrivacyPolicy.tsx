import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Shield, 
  Eye, 
  Lock, 
  Users,
  Globe,
  CheckCircle
} from "lucide-react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  const lastUpdated = "January 15, 2024";

  const sections = [
    {
      title: "Information We Collect",
      content: [
        "Account Information: When you create an account, we collect your name, email address, and company information.",
        "Feedback Data: We collect customer feedback that you submit through our platform, including text responses and ratings.",
        "Usage Data: We collect information about how you use our platform, including features accessed and time spent.",
        "Technical Data: We collect IP addresses, browser type, device information, and other technical data for security and analytics."
      ]
    },
    {
      title: "How We Use Your Information",
      content: [
        "To provide and improve our feedback analytics services",
        "To process and analyze customer feedback using AI",
        "To send you important updates about our service",
        "To provide customer support and respond to inquiries",
        "To ensure platform security and prevent fraud",
        "To comply with legal obligations"
      ]
    },
    {
      title: "Data Sharing and Disclosure",
      content: [
        "We do not sell, trade, or rent your personal information to third parties",
        "We may share data with service providers who help us operate our platform",
        "We may disclose information if required by law or to protect our rights",
        "We may share aggregated, anonymized data for research and analytics"
      ]
    },
    {
      title: "Data Security",
      content: [
        "We use industry-standard encryption to protect your data",
        "We implement strict access controls and authentication measures",
        "We regularly audit our security practices and infrastructure",
        "We maintain SOC 2 Type II compliance for enterprise customers"
      ]
    },
    {
      title: "Your Rights",
      content: [
        "Access: You can request access to your personal data",
        "Correction: You can request corrections to inaccurate data",
        "Deletion: You can request deletion of your personal data",
        "Portability: You can request a copy of your data in a portable format",
        "Objection: You can object to certain types of data processing"
      ]
    },
    {
      title: "Data Retention",
      content: [
        "We retain your account data for as long as your account is active",
        "Feedback data is retained according to your subscription plan",
        "We may retain certain data for legal or security purposes",
        "You can request data deletion at any time"
      ]
    }
  ];

  const compliance = [
    {
      icon: Globe,
      title: "GDPR Compliant",
      description: "We comply with the General Data Protection Regulation (GDPR) and respect your data rights."
    },
    {
      icon: Shield,
      title: "SOC 2 Type II",
      description: "We maintain SOC 2 Type II compliance for enterprise-grade security and privacy."
    },
    {
      icon: Lock,
      title: "Data Encryption",
      description: "All data is encrypted in transit and at rest using industry-standard protocols."
    },
    {
      icon: Users,
      title: "Privacy by Design",
      description: "We build privacy into every feature and process from the ground up."
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
              Privacy Policy
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Your Privacy{" "}
              <span className="gradient-text">Matters</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-4">
              We're committed to protecting your privacy and ensuring the security of your data. 
              This policy explains how we collect, use, and protect your information.
            </p>
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          </div>
        </div>
      </div>

      {/* Compliance Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {compliance.map((item, index) => (
            <Card key={index} className="border-0 bg-background/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Policy Content */}
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

          {/* Contact Section */}
          <div className="bg-muted/30 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-muted-foreground mb-6">
              If you have any questions about this Privacy Policy or our data practices, 
              please don't hesitate to contact us.
            </p>
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Email:</strong> privacy@feedbackflow.com
              </p>
              <p className="text-sm">
                <strong>Address:</strong> FeedbackFlow Inc., 123 Privacy Street, Security City, SC 12345
              </p>
            </div>
          </div>

          {/* Updates Section */}
          <div className="bg-blue-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">Policy Updates</h2>
            <p className="text-muted-foreground mb-4">
              We may update this Privacy Policy from time to time to reflect changes in our practices 
              or for other operational, legal, or regulatory reasons.
            </p>
            <p className="text-sm text-muted-foreground">
              We will notify you of any material changes by posting the new Privacy Policy on this page 
              and updating the "Last updated" date at the top of this policy.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Questions About Privacy?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            We're here to help. Contact our privacy team if you have any questions about 
            how we protect your data and respect your privacy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth">Start Your Free Trial ✨</Link>
            </Button>
            <Button variant="outline" size="lg">
              Contact Privacy Team
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;