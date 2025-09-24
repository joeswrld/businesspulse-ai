import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FeedbackWidget from '@/components/forms/FeedbackWidget';
import CSATForm from '@/components/forms/CSATForm';
import ProductFeedbackForm from '@/components/forms/ProductFeedbackForm';
import { MessageSquare, Heart, Package, Settings } from 'lucide-react';

const FeedbackDemo: React.FC = () => {
  const [projectId, setProjectId] = useState('demo-project-123');
  const [widgetColor, setWidgetColor] = useState('#3B82F6');
  const [showWidget, setShowWidget] = useState(true);

  const handleFeedbackSubmitted = (feedback: any) => {
    console.log('Feedback submitted:', feedback);
    alert('Feedback submitted successfully! Check the console for details.');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Notex Feedback Forms Demo
          </h1>
          <p className="text-xl text-gray-600">
            Test the new feedback forms that behave like the Notex widget
          </p>
        </div>

        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectId">Project ID</Label>
                <Input
                  id="projectId"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="Enter project ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Widget Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={widgetColor}
                  onChange={(e) => setWidgetColor(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Widget Visibility</Label>
                <Button
                  onClick={() => setShowWidget(!showWidget)}
                  variant={showWidget ? 'default' : 'outline'}
                  className="w-full"
                >
                  {showWidget ? 'Hide Widget' : 'Show Widget'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forms Demo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* CSAT Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-red-500" />
                <span>CSAT Survey Form</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CSATForm
                projectId={projectId}
                title="Customer Satisfaction Survey"
                greetingText="How satisfied are you with our service?"
                color={widgetColor}
                onSuccess={handleFeedbackSubmitted}
              />
            </CardContent>
          </Card>

          {/* Product Feedback Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-green-500" />
                <span>Product Feedback Form</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductFeedbackForm
                projectId={projectId}
                title="Product Feedback Form"
                greetingText="Help us improve our product"
                color={widgetColor}
                onSuccess={handleFeedbackSubmitted}
              />
            </CardContent>
          </Card>
        </div>

        {/* Widget Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <span>Floating Widget Demo</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                The floating widget will appear in the bottom-right corner. 
                Click the button to test the widget functionality.
              </p>
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => setShowWidget(true)}
                  variant="outline"
                >
                  Show Widget
                </Button>
                <Button
                  onClick={() => setShowWidget(false)}
                  variant="outline"
                >
                  Hide Widget
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features List */}
        <Card>
          <CardHeader>
            <CardTitle>Features Implemented</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-green-600">✅ Completed Features</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Dynamic project ID detection from URL/data attributes</li>
                  <li>• Supabase integration with proper RLS policies</li>
                  <li>• Form validation and error handling</li>
                  <li>• Success/error toast notifications</li>
                  <li>• Metadata tracking (browser info, page URL, etc.)</li>
                  <li>• Session ID generation for tracking</li>
                  <li>• Responsive design and isolated styling</li>
                  <li>• CSAT rating system (1-5 stars)</li>
                  <li>• Product feedback categorization</li>
                  <li>• Floating widget with minimize/maximize</li>
                  <li>• Real-time updates (via existing Supabase setup)</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-600">🔧 Technical Details</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Reusable hooks for project detection</li>
                  <li>• Centralized feedback submission logic</li>
                  <li>• Comprehensive error handling</li>
                  <li>• TypeScript support throughout</li>
                  <li>• Tailwind CSS styling</li>
                  <li>• Radix UI components</li>
                  <li>• Form state management</li>
                  <li>• Browser compatibility</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Widget */}
      {showWidget && (
        <FeedbackWidget
          projectId={projectId}
          title="Share your feedback with us!"
          color={widgetColor}
          greetingText="Welcome, tell us what's on your mind"
          formType="both"
          defaultForm="csat"
          onFeedbackSubmitted={handleFeedbackSubmitted}
        />
      )}
    </div>
  );
};

export default FeedbackDemo;