import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useFeedbackForms } from '@/hooks/useFeedbackForms';
import { Loader2, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';

interface ProductFeedbackFormProps {
  title?: string;
  description?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

const ProductFeedbackForm: React.FC<ProductFeedbackFormProps> = ({
  title = "Product Feedback",
  description = "Help us improve our product by sharing your thoughts",
  onSuccess,
  onError
}) => {
  const [formData, setFormData] = useState({
    email: '',
    message: ''
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const { submitFeedback, isSubmitting, isValidating, projectId, isValid, error: projectIdError } = useFeedbackForms();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);

    // Client-side validation
    if (!formData.message.trim()) {
      setInlineError('Please share your feedback with us');
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setInlineError('Please enter a valid email address');
      return;
    }

    const result = await submitFeedback(formData, 'product');

    if (result.success) {
      setShowSuccess(true);
      onSuccess?.(result.data);
      // Reset form after a short delay
      setTimeout(() => {
        setFormData({ email: '', message: '' });
        setShowSuccess(false);
      }, 2000);
    } else {
      setInlineError(result.error || 'Failed to submit feedback');
      onError?.(result.error || 'Failed to submit feedback');
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (inlineError) setInlineError(null);
  };

  // Show loading state while validating project ID
  if (isValidating) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Validating project...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error if project ID is invalid
  if (!isValid || !projectId) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-red-200">
        <CardContent className="p-8">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-6 w-6" />
            <div>
              <h3 className="font-semibold">Invalid Project</h3>
              <p className="text-sm text-red-500">{projectIdError}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-2">
          <MessageSquare className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">{title}</CardTitle>
        <p className="text-gray-600">{description}</p>
      </CardHeader>
      
      <CardContent>
        {showSuccess ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-700 mb-2">Thank you!</h3>
            <p className="text-green-600">Your feedback has been submitted successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full"
              />
              <p className="text-sm text-gray-500">
                We'll use this to follow up on your feedback if needed
              </p>
            </div>

            {/* Message Field */}
            <div className="space-y-2">
              <Label htmlFor="message">Your Feedback *</Label>
              <Textarea
                id="message"
                placeholder="What features would you like to see? What's working well? What needs improvement?"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                rows={6}
                className="w-full resize-none"
                required
              />
              <p className="text-sm text-gray-500">
                Share your thoughts, suggestions, or report any issues you've encountered
              </p>
            </div>

            {/* Error Message */}
            {inlineError && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{inlineError}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || !formData.message.trim()}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductFeedbackForm;