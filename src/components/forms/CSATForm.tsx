import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useFeedbackForms } from '@/hooks/useFeedbackForms';
import { Loader2, Star, CheckCircle, AlertCircle } from 'lucide-react';

interface CSATFormProps {
  projectId?: string;
  title?: string;
  greetingText?: string;
  color?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

const CSATForm: React.FC<CSATFormProps> = ({
  projectId,
  title = "Customer Satisfaction Survey",
  greetingText = "Help us improve by sharing your experience",
  color = "#3B82F6",
  onSuccess,
  onError,
  className = ""
}) => {
  const [formData, setFormData] = useState({
    email: '',
    message: '',
    rating: 0
  });
  const [hoveredRating, setHoveredRating] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const { submitFeedback, isSubmitting, isValidating, currentProjectId, isValid, error: projectIdError } = useFeedbackForms(projectId);

  const handleRatingClick = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
    setInlineError(null);
  };

  const handleRatingHover = (rating: number) => {
    setHoveredRating(rating);
  };

  const handleRatingLeave = () => {
    setHoveredRating(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineError(null);

    // Client-side validation
    if (!formData.message.trim()) {
      setInlineError('Please tell us about your experience');
      return;
    }

    if (formData.rating === 0) {
      setInlineError('Please select a rating');
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setInlineError('Please enter a valid email address');
      return;
    }

    const result = await submitFeedback(formData, 'csat');

    if (result.success) {
      setShowSuccess(true);
      onSuccess?.(result.data);
      // Reset form after a short delay
      setTimeout(() => {
        setFormData({ email: '', message: '', rating: 0 });
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
  if (!isValid || !currentProjectId) {
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
    <Card className={`w-full max-w-2xl mx-auto ${className}`}>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-gray-900">{title}</CardTitle>
        <p className="text-gray-600">{greetingText}</p>
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
            {/* Rating Section */}
            <div className="space-y-3">
              <Label className="text-base font-medium">How satisfied are you with our service? *</Label>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleRatingClick(rating)}
                    onMouseEnter={() => handleRatingHover(rating)}
                    onMouseLeave={handleRatingLeave}
                    className={`p-2 rounded-full transition-all duration-200 ${
                      (hoveredRating >= rating || formData.rating >= rating)
                        ? 'text-yellow-400 scale-110'
                        : 'text-gray-300 hover:text-yellow-300'
                    }`}
                  >
                    <Star 
                      className={`h-8 w-8 ${
                        (hoveredRating >= rating || formData.rating >= rating)
                          ? 'fill-current'
                          : ''
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Very Dissatisfied</span>
                <span>Very Satisfied</span>
              </div>
            </div>

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
            </div>

            {/* Message Field */}
            <div className="space-y-2">
              <Label htmlFor="message">Tell us about your experience *</Label>
              <Textarea
                id="message"
                placeholder="What did you like? What could we improve?"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                rows={4}
                className="w-full resize-none"
                required
              />
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
              disabled={isSubmitting || !formData.message.trim() || formData.rating === 0}
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

export default CSATForm;