import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CustomerSatisfactionFormProps {
  projectId: string;
  onSubmit?: (data: any) => void;
  className?: string;
}

interface FormData {
  rating: number | null;
  message: string;
  email: string;
}

export default function CustomerSatisfactionForm({ 
  projectId, 
  onSubmit,
  className 
}: CustomerSatisfactionFormProps) {
  const [formData, setFormData] = useState<FormData>({
    rating: null,
    message: '',
    email: ''
  });
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const handleRatingClick = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
    setErrors(prev => ({ ...prev, rating: undefined }));
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.rating || formData.rating === 0) {
      newErrors.rating = 'Please provide a rating' as any;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const feedbackData = {
        project_id: projectId,
        form_type: 'customer_satisfaction',
        rating: formData.rating,
        message: formData.message || 'No additional comments',
        metadata: {
          email: formData.email || null,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      };

      // Submit to API
      const response = await fetch('/api/widget/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setSubmitted(true);
      toast.success('Thank you for your feedback!');
      
      if (onSubmit) {
        onSubmit(feedbackData);
      }

      // Reset form after a delay
      setTimeout(() => {
        setFormData({
          rating: null,
          message: '',
          email: ''
        });
        setSubmitted(false);
      }, 3000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return 'Very Poor';
      case 2: return 'Poor';
      case 3: return 'Average';
      case 4: return 'Good';
      case 5: return 'Excellent';
      default: return '';
    }
  };

  if (submitted) {
    return (
      <Card className={cn("w-full max-w-md mx-auto", className)}>
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-700 mb-2">
            Thank You!
          </h3>
          <p className="text-gray-600">
            Your feedback has been submitted successfully. We appreciate your input!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Star className="h-5 w-5 text-yellow-500" />
          <span>Customer Satisfaction</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              How would you rate your experience? <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  onClick={() => handleRatingClick(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(null)}
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-colors",
                      (hoveredStar ? star <= hoveredStar : star <= (formData.rating || 0))
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300 hover:text-yellow-300"
                    )}
                  />
                </button>
              ))}
            </div>
            {formData.rating && (
              <p className="text-sm text-gray-600">
                {getRatingText(formData.rating)}
              </p>
            )}
            {errors.rating && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.rating}
              </p>
            )}
          </div>

          {/* Message Section */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Additional Comments (Optional)
            </Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder="Tell us more about your experience..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Email Section */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium flex items-center">
              <Mail className="h-4 w-4 mr-1" />
              Email (Optional)
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="your@email.com"
            />
            <p className="text-xs text-gray-500">
              We'll only use this to follow up on your feedback if needed
            </p>
            {errors.email && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !formData.rating}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}