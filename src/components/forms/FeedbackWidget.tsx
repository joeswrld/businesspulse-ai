import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MessageSquare, 
  X, 
  Minimize2, 
  Maximize2,
  Heart,
  Package
} from 'lucide-react';
import CSATForm from './CSATForm';
import ProductFeedbackForm from './ProductFeedbackForm';

interface FeedbackWidgetProps {
  projectId?: string;
  title?: string;
  color?: string;
  greetingText?: string;
  formType?: 'csat' | 'product' | 'both';
  defaultForm?: 'csat' | 'product';
  onFeedbackSubmitted?: (feedback: any) => void;
  className?: string;
}

const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
  projectId,
  title = "Share your feedback with us!",
  color = "#3B82F6",
  greetingText = "Welcome, tell us what's on your mind",
  formType = 'both',
  defaultForm = 'csat',
  onFeedbackSubmitted,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentForm, setCurrentForm] = useState<'csat' | 'product'>(defaultForm);

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
    setIsOpen(false);
    setIsMinimized(false);
    onFeedbackSubmitted?.(feedback);
  };

  const renderForm = () => {
    if (formType === 'csat') {
      return (
        <CSATForm
          projectId={projectId}
          title={title}
          greetingText={greetingText}
          color={color}
          onSuccess={handleFeedbackSubmitted}
        />
      );
    }

    if (formType === 'product') {
      return (
        <ProductFeedbackForm
          projectId={projectId}
          title={title}
          greetingText={greetingText}
          color={color}
          onSuccess={handleFeedbackSubmitted}
        />
      );
    }

    // Both forms - show form selector
    return (
      <Card className="w-80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold" style={{ color }}>
              {title}
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
          <p className="text-sm text-gray-600">{greetingText}</p>
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
                style={currentForm === 'csat' ? { backgroundColor: color } : {}}
              >
                <Heart className="h-4 w-4 mr-2" />
                Customer Satisfaction Survey
              </Button>
              
              <Button
                onClick={() => setCurrentForm('product')}
                variant={currentForm === 'product' ? 'default' : 'outline'}
                className="w-full justify-start"
                style={currentForm === 'product' ? { backgroundColor: color } : {}}
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
                  color={color}
                  onSuccess={handleFeedbackSubmitted}
                  className="border-0 shadow-none"
                />
              ) : (
                <ProductFeedbackForm
                  projectId={projectId}
                  title="Product Feedback Form"
                  greetingText="Help us improve our product"
                  color={color}
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

  // Floating button (always visible)
  if (!isOpen) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          onClick={toggleWidget}
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200"
          style={{ backgroundColor: color }}
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
              <CardTitle className="text-sm font-medium" style={{ color }}>
                {title}
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

export default FeedbackWidget;