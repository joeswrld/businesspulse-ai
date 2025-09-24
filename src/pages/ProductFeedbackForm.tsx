import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, Package, MessageSquare } from 'lucide-react';

interface ProjectRecord { id: string }

const ProductFeedbackForm: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [projectRecord, setProjectRecord] = useState<ProjectRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  
  const [feedbackType, setFeedbackType] = useState('');
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [rating, setRating] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

  const feedbackTypes = [
    'Bug Report',
    'Feature Request',
    'General Feedback',
    'Usability Issue',
    'Performance Issue',
    'Other'
  ];

  const featureOptions = [
    'User Interface',
    'Performance',
    'Features',
    'Documentation',
    'Support',
    'Pricing',
    'Integration',
    'Mobile Experience'
  ];

  useEffect(() => {
    if (projectId) {
      validateProject();
    }
  }, [projectId]);

  const validateProject = async () => {
    if (!projectId) return;
    try {
      setIsValidating(true);
      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Validation error:', error);
        setIsValid(false);
        setValidationError('This project link is invalid or expired.');
        return;
      }

      if (data) {
        setProjectRecord({ id: data.id });
        setIsValid(true);
        setValidationError('');
      } else {
        setIsValid(false);
        setValidationError('This project link is invalid or expired.');
      }
    } catch (error) {
      console.error('Error validating project:', error);
      setIsValid(false);
      setValidationError('This project link is invalid or expired.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleFeatureChange = (feature: string, checked: boolean) => {
    if (checked) {
      setFeatures([...features, feature]);
    } else {
      setFeatures(features.filter(f => f !== feature));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackType || !feedback.trim()) {
      toast({
        title: 'Required Fields',
        description: 'Please select a feedback type and provide your feedback',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (!projectRecord?.id) {
        throw new Error('Invalid project.');
      }
      const feedbackMessage = `Product Feedback - Type: ${feedbackType}
${rating ? `Rating: ${rating}/5` : ''}
${wouldRecommend !== null ? `Would Recommend: ${wouldRecommend ? 'Yes' : 'No'}` : ''}
${features.length > 0 ? `Areas: ${features.join(', ')}` : ''}

Feedback:
${feedback}`;

      const metadata = {
        form_type: 'product',
        page_url: window.location.href,
        browser: navigator.userAgent,
        rating: rating ? Number(rating) : null,
        would_recommend: wouldRecommend,
        areas: features
      } as const;

      const { error } = await supabase
        .from('feedbacks')
        .insert({
          project_id: projectRecord.id,
          user_email: email.trim() || null,
          content: feedbackMessage,
          sentiment: null,
          metadata
        });

      if (error) {
        console.error('Error submitting feedback:', error);
        throw error;
      }

      setIsSubmitted(true);
      toast({
        title: 'Thank you!',
        description: 'Your product feedback has been submitted successfully.',
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Validating project...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-xl">Invalid or Expired Link</CardTitle>
            <CardDescription>
              {validationError || 'This project link is invalid or expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
              variant="outline"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-xl">Thank you for your feedback! 🎉</CardTitle>
            <CardDescription>
              Your response was recorded successfully.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.close()} 
              className="w-full"
            >
              Close Tab
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-primary mr-2" />
            <CardTitle className="text-2xl">Product Feedback Form</CardTitle>
          </div>
          <CardDescription>
            Help us improve our product by sharing your thoughts and suggestions
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="space-y-3">
              <Label>Would you recommend this product to others? (optional)</Label>
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

            <div className="space-y-2">
              <Label htmlFor="feedback">Your Feedback *</Label>
              <Textarea
                id="feedback"
                placeholder="Please share your detailed feedback, suggestions, or report any issues you've encountered..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={6}
                className="resize-none"
                required
              />
            </div>

            <Button 
              type="submit" 
              disabled={!feedbackType || !feedback.trim() || isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductFeedbackForm;