import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { MessageSquare, Star, ExternalLink } from 'lucide-react';

const FeedbackTest: React.FC = () => {
  // This would be replaced with actual project ID from your system
  const testProjectId = 'test-project-123';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Feedback Forms Test</h1>
          <p className="text-gray-600">Test the CSAT and Product Feedback forms</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* CSAT Form Test */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Star className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Customer Satisfaction Survey</CardTitle>
                  <p className="text-sm text-gray-600">Test the CSAT form with rating functionality</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                This form includes a 5-star rating system and collects customer satisfaction feedback.
              </p>
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Test URL:</p>
                <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                  /feedback/{testProjectId}/csat
                </code>
              </div>
              <Button asChild className="w-full">
                <Link to={`/feedback/${testProjectId}/csat`} target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test CSAT Form
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Product Feedback Form Test */}
          <Card className="border-2 border-green-200">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Product Feedback Form</CardTitle>
                  <p className="text-sm text-gray-600">Test the product feedback collection form</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                This form collects detailed product feedback and feature requests.
              </p>
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Test URL:</p>
                <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                  /feedback/{testProjectId}/product
                </code>
              </div>
              <Button asChild className="w-full">
                <Link to={`/feedback/${testProjectId}/product`} target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Test Product Form
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Features Implemented</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Form Features</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✅ Dynamic project ID validation</li>
                  <li>✅ Real-time form validation</li>
                  <li>✅ Submit button state management</li>
                  <li>✅ Success/error message display</li>
                  <li>✅ Email validation (optional)</li>
                  <li>✅ Rating system for CSAT</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Data Features</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✅ Session ID generation</li>
                  <li>✅ Browser metadata collection</li>
                  <li>✅ Form type tracking</li>
                  <li>✅ Real-time feedback updates</li>
                  <li>✅ Supabase integration</li>
                  <li>✅ Error handling</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeedbackTest;