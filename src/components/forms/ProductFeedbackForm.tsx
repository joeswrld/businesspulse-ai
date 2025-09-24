import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Send, Loader2, CheckCircle } from 'lucide-react';
import { useFeedbackSubmission, FeedbackSubmissionData } from '@/hooks/useFeedbackSubmission';
import { useProjectId } from '@/hooks/useProjectId';

interface ProductFeedbackFormProps {
  projectId?: string;
  title?: string;
  greetingText?: string;
  color?: string;
  onSuccess?: (data: any) => void;
  className?: string;
}

const ProductFeedbackForm: React.FC<ProductFeedbackFormProps> = ({
  projectId: propProjectId,
  title = "Product Feedback Form",
  greetingText = "Help us improve our product by sharing your thoughts",
  color = "#3B82F6",
  onSuccess,
  className = ""
}) => {
  const [feedbackType, setFeedbackType] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [rating, setRating] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { projectId: detectedProjectId, isValidating, isValid, error: projectError } = useProjectId();
  const { submitFeedback, isSubmitting } = useFeedbackSubmission();

  // Use prop projectId if provided, otherwise use detected one
  const finalProjectId = propProjectId || detectedProjectId;

  const feedbackTypes = [
    'Bug Report',
    'Feature Request',
    'General Feedback',
    'Usability Issue',
    'Performance Issue',
    'Other',
  ];

  const featureOptions = [
    'User Interface',
    'Performance',
    'Features',
    'Documentation',
    'Support',
    'Pricing',
    'Integration',
    'Mobile Experience',
  ];

  const handleFeatureChange = (feature: string, checked: boolean) => {
    if (checked) {
      setFeatures([...features, feature]);
    } else {
      setFeatures(features.filter((f) => f !== feature));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!finalProjectId) {
      return;
    }

    if (!feedbackType || !message.trim()) {
      return;
    }

    // Prepare detailed feedback message
    const detailedMessage = `Product Feedback - Type: ${feedbackType}
${rating ? `Rating: ${rating}/5` : ''}
${wouldRecommend !== null ? `Would Recommend: ${wouldRecommend ? 'Yes' : 'No'}` : ''}
${features.length > 0 ? `Areas: ${features.join(', ')}` : ''}

${message}`;

    const submissionData: FeedbackSubmissionData = {
      projectId: finalProjectId,
      email: email.trim() || undefined,
      message: detailedMessage,
      formType: 'product',
      metadata: {
        feedback_type: feedbackType,
        rating: rating ? Number(rating) : null,
        would_recommend: wouldRecommend,
        features: features
      }
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
      <Card className={`w-full max-w-2xl ${className}`}>
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
      <Card className={`w-full max-w-2xl ${className}`}>
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
      <Card className={`w-full max-w-2xl ${className}`}>
        <CardHeader>
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
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
              setFeedbackType('');
              setEmail('');
              setMessage('');
              setFeatures([]);
              setRating('');
              setWouldRecommend(null);
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
    <Card className={`w-full max-w-2xl ${className}`}>
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Package className="h-8 w-8 mr-2" style={{ color }} />
          <CardTitle className="text-2xl font-semibold" style={{ color }}>
            {title}
          </CardTitle>
        </div>
        <p className="text-gray-600">{greetingText}</p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback Type and Rating */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="feedbackType">Feedback Type *</Label>
              <Select value={feedbackType} onValueChange={setFeedbackType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select feedback type" />
                </SelectTrigger>
                <SelectContent>
                  {feedbackTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating">Overall Rating (optional)</Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Poor</SelectItem>
                  <SelectItem value="2">2 - Fair</SelectItem>
                  <SelectItem value="3">3 - Good</SelectItem>
                  <SelectItem value="4">4 - Very Good</SelectItem>
                  <SelectItem value="5">5 - Excellent</SelectItem>
                </SelectContent>
              </Select>
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
            />
          </div>

          {/* Features */}
          <div className="space-y-3">
            <Label>Which areas would you like to provide feedback on? (optional)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {featureOptions.map((feature) => (
                <div key={feature} className="flex items-center space-x-2">
                  <Checkbox
                    id={feature}
                    checked={features.includes(feature)}
                    onCheckedChange={(checked) => handleFeatureChange(feature, checked as boolean)}
                  />
                  <Label htmlFor={feature} className="text-sm">
                    {feature}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Recommend */}
          <div className="space-y-3">
            <Label>Would you recommend this product? (optional)</Label>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recommend-yes"
                  checked={wouldRecommend === true}
                  onCheckedChange={(checked) => setWouldRecommend(checked ? true : null)}
                />
                <Label htmlFor="recommend-yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recommend-no"
                  checked={wouldRecommend === false}
                  onCheckedChange={(checked) => setWouldRecommend(checked ? false : null)}
                />
                <Label htmlFor="recommend-no">No</Label>
              </div>
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <Label htmlFor="message">Your Feedback *</Label>
            <Textarea
              id="message"
              placeholder="Please share your detailed feedback..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="resize-none"
              required
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!feedbackType || !message.trim() || isSubmitting}
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

export default ProductFeedbackForm;