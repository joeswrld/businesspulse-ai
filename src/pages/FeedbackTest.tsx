import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Heart, 
  Package, 
  Settings, 
  Eye, 
  Code, 
  ExternalLink,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import EnhancedFeedbackWidget from '@/components/forms/EnhancedFeedbackWidget';
import CSATForm from '@/components/forms/CSATForm';
import ProductFeedbackForm from '@/components/forms/ProductFeedbackForm';
import { useFeedbackSettings } from '@/hooks/useFeedbackSettings';

const FeedbackTest: React.FC = () => {
  const [activeTab, setActiveTab] = useState('widget');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<any>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Get feedback settings for demonstration
  const { settings, loading: settingsLoading } = useFeedbackSettings();

  const handleFeedbackSubmitted = (feedback: any) => {
    setFeedbackSubmitted(feedback);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const embedCode = `<!-- Notex Feedback Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/feedback-widget.js';
    script.setAttribute('data-project-id', '${settings?.project_id || 'your-project-id'}');
    script.setAttribute('data-widget-color', '${settings?.widget_color || '#3B82F6'}');
    script.setAttribute('data-widget-title', '${settings?.widget_title || 'Share your feedback with us!'}');
    script.setAttribute('data-greeting-text', '${settings?.greeting_text || 'Welcome, tell us what\'s on your mind'}');
    document.head.appendChild(script);
  })();
</script>`;

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading feedback components...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageSquare className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Feedback System Test</h1>
            <p className="text-gray-600 mt-1">
              Test and preview all feedback components
            </p>
          </div>
        </div>
        {showSuccess && (
          <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Copied to clipboard!</span>
          </div>
        )}
      </div>

      {/* Success Message */}
      {feedbackSubmitted && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Feedback Submitted Successfully!</h3>
                <p className="text-sm">Thank you for testing the feedback system.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="widget">Widget</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="standalone">Standalone</TabsTrigger>
          <TabsTrigger value="embed">Embed Code</TabsTrigger>
        </TabsList>

        <TabsContent value="widget" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Enhanced Feedback Widget</span>
              </CardTitle>
              <CardDescription>
                A floating widget that can be embedded on any website. Click the button in the bottom-right corner to test.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Features:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Floating button with customizable color</li>
                    <li>• Form type selection (CSAT or Product Feedback)</li>
                    <li>• Minimizable and resizable</li>
                    <li>• Real-time settings from database</li>
                    <li>• Success animations</li>
                  </ul>
                </div>
                
                <div className="text-center p-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 mb-4">
                    Look for the floating feedback button in the bottom-right corner of this page
                  </p>
                  <Badge variant="outline" className="text-blue-600">
                    Widget is active and ready to test
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  <span>Customer Satisfaction Survey</span>
                </CardTitle>
                <CardDescription>
                  Test the CSAT form with rating system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CSATForm
                  projectId={settings?.project_id}
                  title="Customer Satisfaction Survey"
                  greetingText="How satisfied are you with our service?"
                  color="#EF4444"
                  onSuccess={handleFeedbackSubmitted}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-green-500" />
                  <span>Product Feedback Form</span>
                </CardTitle>
                <CardDescription>
                  Test the product feedback form
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductFeedbackForm
                  projectId={settings?.project_id}
                  title="Product Feedback Form"
                  greetingText="Help us improve our product"
                  color="#10B981"
                  onSuccess={handleFeedbackSubmitted}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="standalone" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ExternalLink className="h-5 w-5" />
                <span>Standalone Feedback Page</span>
              </CardTitle>
              <CardDescription>
                A full-page feedback form that can be accessed via direct URL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Standalone Page Features:</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Full-page responsive design</li>
                    <li>• Form type selection</li>
                    <li>• Customizable branding</li>
                    <li>• Success animations</li>
                    <li>• Mobile-friendly</li>
                  </ul>
                </div>
                
                <div className="flex items-center space-x-4">
                  <Button asChild>
                    <a href={`/feedback/${settings?.project_id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Standalone Page
                    </a>
                  </Button>
                  <p className="text-sm text-gray-600">
                    Opens in a new tab
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code className="h-5 w-5" />
                <span>Embed Code</span>
              </CardTitle>
              <CardDescription>
                Copy this code to embed the feedback widget on your website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">JavaScript Embed Code</label>
                  <Button onClick={copyEmbedCode} size="sm" variant="outline">
                    <Code className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                </div>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                  {embedCode}
                </pre>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Direct Link</label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-gray-100 p-2 rounded text-sm">
                    {window.location.origin}/feedback/{settings?.project_id}
                  </code>
                  <Button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/feedback/${settings?.project_id}`);
                      setShowSuccess(true);
                      setTimeout(() => setShowSuccess(false), 2000);
                    }} 
                    size="sm" 
                    variant="outline"
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">Implementation Notes:</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Add the script tag to your website's HTML</li>
                  <li>• The widget will automatically appear in the bottom-right corner</li>
                  <li>• Customize colors and text using data attributes</li>
                  <li>• No additional CSS or JavaScript required</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Floating Widget - Always visible */}
      <EnhancedFeedbackWidget
        projectId={settings?.project_id}
        onFeedbackSubmitted={handleFeedbackSubmitted}
      />
    </div>
  );
};

export default FeedbackTest;