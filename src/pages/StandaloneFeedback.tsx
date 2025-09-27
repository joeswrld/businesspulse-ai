import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFeedbackSettings } from '@/hooks/useFeedbackSettings';
import { Loader2, AlertCircle } from 'lucide-react';
import CSATForm from '@/components/forms/CSATForm';
import ProductFeedbackForm from '@/components/forms/ProductFeedbackForm';

const StandaloneFeedback: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [currentForm, setCurrentForm] = useState<'csat' | 'product'>('csat');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const { 
    settings, 
    loading, 
    error 
  } = useFeedbackSettings(projectId);

  const handleFeedbackSubmitted = (feedback: any) => {
    setShowSuccess(true);
    // Hide success message after 5 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 5000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading feedback form...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-700 mb-2">Error</h3>
            <p className="text-red-600 mb-4">
              {error || 'Failed to load feedback form. Please check the link and try again.'}
            </p>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-green-700 mb-2">Thank You!</h3>
            <p className="text-green-600 mb-6">
              Your feedback has been submitted successfully. We appreciate you taking the time to share your thoughts.
            </p>
            <Button 
              onClick={() => setShowSuccess(false)}
              variant="outline"
              className="w-full"
            >
              Submit Another Feedback
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle 
              className="text-2xl font-bold"
              style={{ color: settings.widget_color || '#3B82F6' }}
            >
              {settings.widget_title || 'Share your feedback with us!'}
            </CardTitle>
            <p className="text-gray-600 mt-2">
              {settings.greeting_text || 'Welcome, tell us what\'s on your mind'}
            </p>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {/* Form Type Selector */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">Choose the type of feedback you'd like to provide:</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => setCurrentForm('csat')}
                  variant={currentForm === 'csat' ? 'default' : 'outline'}
                  className="h-16 justify-start"
                  style={currentForm === 'csat' ? { backgroundColor: settings.widget_color || '#3B82F6' } : {}}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Customer Satisfaction</div>
                      <div className="text-sm opacity-90">Rate your experience</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => setCurrentForm('product')}
                  variant={currentForm === 'product' ? 'default' : 'outline'}
                  className="h-16 justify-start"
                  style={currentForm === 'product' ? { backgroundColor: settings.widget_color || '#3B82F6' } : {}}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Product Feedback</div>
                      <div className="text-sm opacity-90">Share your thoughts</div>
                    </div>
                  </div>
                </Button>
              </div>

              {/* Form Content */}
              <div className="pt-6">
                {currentForm === 'csat' ? (
                  <CSATForm
                    projectId={projectId}
                    title="Customer Satisfaction Survey"
                    greetingText="How satisfied are you with our service?"
                    color={settings.widget_color || '#3B82F6'}
                    onSuccess={handleFeedbackSubmitted}
                  />
                ) : (
                  <ProductFeedbackForm
                    projectId={projectId}
                    title="Product Feedback Form"
                    greetingText="Help us improve our product"
                    color={settings.widget_color || '#3B82F6'}
                    onSuccess={handleFeedbackSubmitted}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StandaloneFeedback;