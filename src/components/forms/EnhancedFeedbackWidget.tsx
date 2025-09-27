import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MessageSquare, 
  X, 
  Minimize2, 
  Maximize2,
  Heart,
  Package,
  Settings,
  CheckCircle
} from 'lucide-react';
import CSATForm from './CSATForm';
import ProductFeedbackForm from './ProductFeedbackForm';
import { useFeedbackSettings } from '@/hooks/useFeedbackSettings';

interface EnhancedFeedbackWidgetProps {
  projectId?: string;
  onFeedbackSubmitted?: (feedback: any) => void;
  className?: string;
}

const EnhancedFeedbackWidget: React.FC<EnhancedFeedbackWidgetProps> = ({
  projectId,
  onFeedbackSubmitted,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentForm, setCurrentForm] = useState<'csat' | 'product'>('csat');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const { 
    settings, 
    loading: settingsLoading, 
    error: settingsError 
  } = useFeedbackSettings(projectId);

  const toggleWidget = () => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleFeedbackSubmitted = (feedback: any) => {
    setShowSuccess(true);
    setIsOpen(false);
    setIsMinimized(false);
    onFeedbackSubmitted?.(feedback);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  // Show loading state while fetching settings
  if (settingsLoading) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          className="rounded-full w-14 h-14 shadow-lg"
          disabled
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  // Show error state if settings failed to load
  if (settingsError || !settings) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          onClick={toggleWidget}
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200 bg-red-500 hover:bg-red-600"
          title="Feedback widget (Error loading settings)"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  const renderForm = () => {
    return (
      <Card className="w-80 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle 
              className="text-lg font-semibold" 
              style={{ color: settings.widget_color || '#3B82F6' }}
            >
              {settings.widget_title || 'Share your feedback with us!'}
            </CardTitle>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMinimize}
                className="h-6 w-6 p-0"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleWidget}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            {settings.greeting_text || 'Welcome, tell us what\'s on your mind'}
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">Choose the type of feedback you'd like to provide:</p>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={() => setCurrentForm('csat')}
                variant={currentForm === 'csat' ? 'default' : 'outline'}
                className="w-full justify-start"
                style={currentForm === 'csat' ? { backgroundColor: settings.widget_color || '#3B82F6' } : {}}
              >
                <Heart className="h-4 w-4 mr-2" />
                Customer Satisfaction Survey
              </Button>
              
              <Button
                onClick={() => setCurrentForm('product')}
                variant={currentForm === 'product' ? 'default' : 'outline'}
                className="w-full justify-start"
                style={currentForm === 'product' ? { backgroundColor: settings.widget_color || '#3B82F6' } : {}}
              >
                <Package className="h-4 w-4 mr-2" />
                Product Feedback Form
              </Button>
            </div>

            <div className="pt-4">
              {currentForm === 'csat' ? (
                <CSATForm
                  projectId={projectId}
                  title="Customer Satisfaction Survey"
                  greetingText="How satisfied are you with our service?"
                  color={settings.widget_color || '#3B82F6'}
                  onSuccess={handleFeedbackSubmitted}
                  className="border-0 shadow-none"
                />
              ) : (
                <ProductFeedbackForm
                  projectId={projectId}
                  title="Product Feedback Form"
                  greetingText="Help us improve our product"
                  color={settings.widget_color || '#3B82F6'}
                  onSuccess={handleFeedbackSubmitted}
                  className="border-0 shadow-none"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Success state
  if (showSuccess) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Card className="w-80 shadow-lg">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-700 mb-2">Thank you!</h3>
            <p className="text-green-600">Your feedback has been submitted successfully.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Floating button (always visible)
  if (!isOpen) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          onClick={toggleWidget}
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200"
          style={{ backgroundColor: settings.widget_color || '#3B82F6' }}
          title={settings.widget_title || 'Share your feedback with us!'}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Card className="w-80 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle 
                className="text-sm font-medium" 
                style={{ color: settings.widget_color || '#3B82F6' }}
              >
                {settings.widget_title || 'Share your feedback with us!'}
              </CardTitle>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMinimize}
                  className="h-6 w-6 p-0"
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleWidget}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Full widget
  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {renderForm()}
    </div>
  );
};

export default EnhancedFeedbackWidget;