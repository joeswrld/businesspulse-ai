import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Search, ArrowLeft } from 'lucide-react';
import SEO from '@/components/SEO';
import { generateFAQSchema } from '@/utils/structuredData';

const FAQ = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const faqs = [
    {
      category: 'Getting Started',
      questions: [
        {
          question: 'What is NoteX and how does it work?',
          answer: 'NoteX is an AI-powered feedback analytics platform that helps businesses collect, analyze, and act on customer feedback. It uses advanced sentiment analysis and natural language processing to provide actionable insights from customer feedback in real-time.',
        },
        {
          question: 'How do I get started with NoteX?',
          answer: 'Getting started is easy! Simply sign up for a free trial, create your first project, and integrate our feedback widget into your website or application. You can start collecting feedback immediately, and our AI will begin analyzing responses right away.',
        },
        {
          question: 'Do I need coding skills to use NoteX?',
          answer: 'No coding skills required! NoteX is designed to be user-friendly. Simply copy and paste our widget code into your website, or use our no-code integration options. Our dashboard is intuitive and easy to navigate.',
        },
      ],
    },
    {
      category: 'Features & Functionality',
      questions: [
        {
          question: 'What types of feedback can I collect?',
          answer: 'You can collect various types of feedback including customer satisfaction surveys (CSAT), product feedback, feature requests, bug reports, and general comments. Our platform supports both structured (ratings, multiple choice) and unstructured (text) feedback.',
        },
        {
          question: 'How does AI sentiment analysis work?',
          answer: 'Our AI analyzes the emotional tone of customer feedback using natural language processing. It categorizes feedback as positive, negative, or neutral, and identifies key themes and topics. This helps you quickly understand customer sentiment at scale.',
        },
        {
          question: 'Can I generate reports automatically?',
          answer: 'Yes! NoteX can automatically generate detailed reports with insights, trends, and actionable recommendations. You can schedule reports to be sent to your team regularly, or generate them on-demand.',
        },
        {
          question: 'Is there a mobile app?',
          answer: 'Currently, NoteX is a web-based platform optimized for both desktop and mobile browsers. You can access your dashboard and manage feedback from any device with an internet connection.',
        },
      ],
    },
    {
      category: 'Pricing & Plans',
      questions: [
        {
          question: 'What plans does NoteX offer?',
          answer: 'We offer a Business plan at ₦25,000/month that includes unlimited feedback collection, AI-powered analytics, automated reporting, team collaboration tools, and priority support. All new users get an 8-day free trial.',
        },
        {
          question: 'Can I cancel my subscription at any time?',
          answer: 'Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees. If you cancel, you\'ll continue to have access until the end of your billing period.',
        },
        {
          question: 'Do you offer refunds?',
          answer: 'We offer a 30-day money-back guarantee. If you\'re not satisfied with NoteX within the first 30 days, contact our support team for a full refund.',
        },
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept payments via Paystack, which supports credit/debit cards, bank transfers, and mobile money. All payments are secure and encrypted.',
        },
      ],
    },
    {
      category: 'Integration & Setup',
      questions: [
        {
          question: 'How do I integrate NoteX with my website?',
          answer: 'Integration is simple! After signing up, go to your Feedback Settings page and copy the provided widget code. Paste this code into your website\'s HTML, typically just before the closing </body> tag. The widget will appear automatically.',
        },
        {
          question: 'Can I customize the feedback widget?',
          answer: 'Yes! You can customize the widget\'s appearance including colors, position, greeting text, and which feedback forms are enabled. All customization options are available in your Feedback Settings.',
        },
        {
          question: 'Does NoteX integrate with other tools?',
          answer: 'We\'re continuously adding integrations. Currently, you can export your data to CSV for use with other tools. Integration with Slack, email marketing platforms, and CRM systems are planned for future releases.',
        },
      ],
    },
    {
      category: 'Data & Security',
      questions: [
        {
          question: 'Is my data secure?',
          answer: 'Absolutely! We take security seriously. All data is encrypted in transit and at rest. We use industry-standard security practices and are hosted on secure, enterprise-grade infrastructure with Supabase.',
        },
        {
          question: 'Where is my data stored?',
          answer: 'Your data is securely stored on Supabase servers with automated backups. We comply with data protection regulations and never share your data with third parties without your explicit consent.',
        },
        {
          question: 'Can I export my data?',
          answer: 'Yes, you can export all your feedback data, analytics, and reports at any time in CSV or JSON format. We believe your data is yours, and we make it easy to access.',
        },
        {
          question: 'Do you comply with GDPR?',
          answer: 'Yes, NoteX is designed with GDPR compliance in mind. We provide tools to help you manage user consent, data deletion requests, and data portability.',
        },
      ],
    },
    {
      category: 'Support',
      questions: [
        {
          question: 'How can I get help if I have issues?',
          answer: 'We offer multiple support channels: email support at support@notex.com.ng, comprehensive documentation, video tutorials, and in-app help. Business plan users get priority support with faster response times.',
        },
        {
          question: 'Do you offer training or onboarding?',
          answer: 'Yes! We provide onboarding assistance to help you get started. We also have extensive documentation, video tutorials, and best practice guides to help you get the most out of NoteX.',
        },
        {
          question: 'What are your support hours?',
          answer: 'Our support team is available Monday to Friday, 9 AM to 5 PM WAT (West Africa Time). Email support is monitored 24/7 for urgent issues, though response times may vary outside business hours.',
        },
      ],
    },
  ];

  const allQuestions = faqs.flatMap((category) =>
    category.questions.map((q) => ({
      ...q,
      category: category.category,
    }))
  );

  const filteredFAQs = searchTerm
    ? allQuestions.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : null;

  const faqSchema = generateFAQSchema(
    allQuestions.map((q) => ({ question: q.question, answer: q.answer }))
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="FAQ - Frequently Asked Questions | NoteX"
        description="Find answers to common questions about NoteX AI-powered feedback analytics platform. Learn about features, pricing, integration, security, and support."
        keywords="notex faq, feedback analytics questions, customer support, help center, pricing information"
        url="/faq"
        structuredData={faqSchema}
      />

      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-4xl font-bold mb-2">Frequently Asked Questions</h1>
          <p className="text-muted-foreground">
            Find answers to common questions about NoteX
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <Card className="p-6 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              placeholder="Search for answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {searchTerm && filteredFAQs ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">
              Search Results ({filteredFAQs.length})
            </h2>
            {filteredFAQs.length > 0 ? (
              <Accordion type="single" collapsible className="space-y-4">
                {filteredFAQs.map((faq, index) => (
                  <Card key={index} className="overflow-hidden">
                    <AccordionItem value={`search-${index}`} className="border-none">
                      <AccordionTrigger className="px-6 hover:no-underline">
                        <div className="text-left">
                          <div className="text-sm text-muted-foreground mb-1">
                            {faq.category}
                          </div>
                          <div className="font-semibold">{faq.question}</div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  </Card>
                ))}
              </Accordion>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  No results found. Try different keywords.
                </p>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {faqs.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <h2 className="text-2xl font-bold mb-4">{category.category}</h2>
                <Accordion type="single" collapsible className="space-y-4">
                  {category.questions.map((faq, faqIndex) => (
                    <Card key={faqIndex} className="overflow-hidden">
                      <AccordionItem
                        value={`${categoryIndex}-${faqIndex}`}
                        className="border-none"
                      >
                        <AccordionTrigger className="px-6 hover:no-underline">
                          <span className="font-semibold text-left">
                            {faq.question}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6">
                          <p className="text-muted-foreground">{faq.answer}</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Card>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        )}

        <Card className="mt-12 p-8 text-center bg-card">
          <h2 className="text-2xl font-bold mb-2">Still have questions?</h2>
          <p className="text-muted-foreground mb-6">
            Can't find the answer you're looking for? Our support team is here to
            help.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate('/help-center')}>Visit Help Center</Button>
            <Button variant="outline" onClick={() => navigate('/contact')}>
              Contact Support
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default FAQ;
