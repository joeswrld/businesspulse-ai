import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Star, Send, Loader2, Heart } from 'lucide-react';
import { useFeedbackSubmission, FeedbackSubmissionData } from '@/hooks/useFeedbackSubmission';
import { useProjectId } from '@/hooks/useProjectId';

interface CSATFormProps {
  projectId?: string;
  title?: string;
  greetingText?: string;
  color?: string;
  onSuccess?: (data: any) => void;
  className?: string;
}

const CSATForm: React.FC<CSATFormProps> = ({
  projectId: propProjectId,
  title = "Customer Satisfaction Survey",
  greetingText = "How satisfied are you with our service?",
  color = "#3B82F6",
  onSuccess,
  className = ""
}) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { projectId: detectedProjectId, isValidating, isValid, error: projectError } = useProjectId();
  const { submitFeedback, isSubmitting } = useFeedbackSubmission();

  // Use prop projectId if provided, otherwise use detected one
  const finalProjectId = propProjectId || detectedProjectId;

  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!finalProjectId) {
      return;
    }

    if (!rating || !message.trim()) {
      return;
    }

    const submissionData: FeedbackSubmissionData = {
      projectId: finalProjectId,
      email: email.trim() || undefined,
      message: message.trim(),
      rating: rating,
      formType: 'csat'
    };

    const result = await submitFeedback(submissionData);

    if (result.success) {
      setIsSubmitted(true);
      onSuccess?.(result.data);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <Card className={`w-full max-w-md ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (!isValid || !finalProjectId) {
    return (
      <Card className={`w-full max-w-md ${className}`}>
        <CardHeader>
          <CardTitle className="text-center text-red-600">Invalid Project</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600 mb-4">
            {projectError || 'This project link is invalid or expired.'}
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="w-full"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <Card className={`w-full max-w-md ${className}`}>
        <CardHeader>
          <div className="text-center">
            <Heart className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">Thank you! 🎉</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600 mb-4">
            Your feedback has been submitted successfully. We appreciate your input!
          </p>
          <Button 
            onClick={() => {
              setIsSubmitted(false);
              setEmail('');
              setMessage('');
              setRating(null);
            }} 
            className="w-full"
            style={{ backgroundColor: color }}
          >
            Submit Another Response
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Main form
  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-semibold" style={{ color }}>
          {title}
        </CardTitle>
        <p className="text-sm text-gray-600">{greetingText}</p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Overall Satisfaction *</Label>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingClick(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(null)}
                  className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoveredRating || rating || 0)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Very Dissatisfied</span>
              <span>Very Satisfied</span>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Tell us more about your experience *</Label>
            <Textarea
              id="message"
              placeholder="What did you like or dislike? How can we improve?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full resize-none"
              required
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!rating || !message.trim() || isSubmitting}
            className="w-full flex items-center space-x-2"
            style={{ backgroundColor: color }}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CSATForm;