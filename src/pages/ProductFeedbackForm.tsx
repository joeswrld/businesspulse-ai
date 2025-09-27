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
import { Loader2, CheckCircle, AlertCircle, Package, Star } from 'lucide-react';

interface ProductFeedbackFormProps {
  projectId?: string;
  previewMode?: boolean;
  onSubmitted?: (data: any) => void;
}

interface FeedbackSettings {
  id: string;
  project_id: string;
  widget_title: string;
  widget_color: string;
  greeting_text: string;
  product_feedback_enabled: boolean;
}

const ProductFeedbackForm: React.FC<ProductFeedbackFormProps> = ({
  projectId: propProjectId,
  previewMode = false,
  onSubmitted
}) => {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const projectId = propProjectId || urlProjectId;

  const [isValidating, setIsValidating] = useState(!previewMode);
  const [isValid, setIsValid] = useState(previewMode);
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  const [feedbackType, setFeedbackType] = useState('');
  const [email, setEmail] = useState('');
  const [feedback, setFeedback] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [priority, setPriority] = useState('');

  const feedbackTypes = [
    'Bug Report',
    'Feature Request',
    'General Feedback',
    'Usability Issue',
    'Performance Issue',
    'Documentation',
    'Integration Request',
    'Other',
  ];

  const featureOptions = [
    'User Interface',
    'Performance',
    'Features & Functionality',
    'Documentation',
    'Customer Support',
    'Pricing & Billing',
    'API & Integrations',
    'Mobile Experience',
    'Security',
    'Accessibility'
  ];

  const priorityLevels = [
    { value: 'low', label: 'Low - Nice to have' },
    { value: 'medium', label: 'Medium - Important' },
    { value: 'high', label: 'High - Critical' },
    { value: 'urgent', label: 'Urgent - Blocking' }
  ];

  useEffect(() => {
    if (projectId && !previewMode) {
      validateProject();
    } else if (previewMode) {
      // For preview mode, set dummy settings
      setSettings({
        id: 'preview',
        project_id: projectId || 'preview',
        widget_title: 'Product Feedback Form',
        widget_color: '#10B981',
        greeting_text: 'Help us improve our product by sharing your thoughts and suggestions',
        product_feedback_enabled: true
      });
    }
  }, [projectId, previewMode]);

  const validateProject = async () => {
    if (!projectId) {
      setValidationError('No project ID provided in URL');
      setIsValid(false);
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    console.log('Validating project ID:', projectId);

    try {
      const { data, error } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('project_id', projectId)
        .eq('product_feedback_enabled', true)
        .maybeSingle();

      if (error) {
        console.error('Validation error:', error);
        throw error;
      }

      if (data) {
        setSettings(data);
        setIsValid(true);
        setValidationError('');
        console.log('✅ Project validated successfully');
      } else {
        setIsValid(false);
        setValidationError(`Product feedback form is not enabled for this project.`);
        console.log('❌ Project not found or form disabled');
      }
    } catch (err) {
      console.error('Error validating project:', err);
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
      setFeatures(features.filter((f) => f !== feature));
    }
  };

  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (previewMode) {
      toast({
        title: 'Preview Mode',
        description: 'This is a preview. Feedback will not be submitted.',
        variant: 'default'
      });
      return;
    }

    if (!feedbackType || !feedback.trim()) {
      toast({
        title: 'Required Fields',
        description: 'Please select a feedback type and provide your feedback',
        variant: 'destructive'
      });
      return;
    }

    if (!settings?.id) {
      toast({
        title: 'Invalid Project',
        description: 'Cannot submit feedback for this project.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get the project's internal UUID for the feedback table
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('project_id', projectId)
        .single();

      if (projectError || !projectData) {
        throw new Error('Project not found');
      }

      const feedbackData = {
        project_id: projectData.id,
        form_type: 'product_feedback',
        message: feedback.trim(),
        rating: rating,
        metadata: {
          email: email.trim() || null,
          feedback_type: feedbackType,
          priority: priority || null,
          features: features,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      };

      const { error } = await supabase
        .from('feedback')
        .insert([feedbackData]);

      if (error) {
        console.error('Error submitting feedback:', error);
        
        let errorMessage = 'Failed to submit feedback.';
        if (error.code === '23503') {
          errorMessage = 'Invalid project reference. Please check your project link.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
        return;
      }

      setIsSubmitted(true);
      if (onSubmitted) {
        onSubmitted(feedbackData);
      }
      toast({
        title: 'Thank you!',
        description: 'Your product feedback has been submitted successfully.'
      });
    } catch (err) {
      console.error('Submit failed:', err);
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
          <p className="text-muted-foreground">Loading feedback form...</p>
        </div>
      </div>
    );
  }

  if (!isValid && !previewMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-xl">Form Not Available</CardTitle>
            <CardDescription>{validationError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full" variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted && !previewMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-xl">Thank you for your feedback! 🎉</CardTitle>
            <CardDescription>Your product feedback has been recorded successfully.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.close()} className="w-full">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const containerClass = previewMode 
    ? "w-full" 
    : "min-h-screen bg-background flex items-center justify-center p-4";

  return (
    <div className={containerClass}>
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Package 
              className="h-8 w-8 mr-2" 
              style={{ color: settings?.widget_color || '#10B981' }}
            />
            <CardTitle className="text-2xl">
              {settings?.widget_title || 'Product Feedback Form'}
            </CardTitle>
          </div>
          <CardDescription>
            {settings?.greeting_text || 'Help us improve our product by sharing your thoughts and suggestions'}
          </CardDescription>
          {previewMode && (
            <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
              Preview Mode - Form will not submit
            </div>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Feedback Type and Priority */}
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
                <Label htmlFor="priority">Priority Level (optional)</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
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
              <p className="text-xs text-muted-foreground">
                We'll only use this to follow up on your feedback if needed
              </p>
            </div>

            {/* Feature Areas */}
            <div className="space-y-3">
              <Label>Which areas does your feedback relate to? (optional)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {featureOptions.map((feature) => (
                  <div key={feature} className="flex items-center space-x-2">
                    <Checkbox
                      id={feature}
                      checked={features.includes(feature)}
                      onCheckedChange={(checked) => handleFeatureChange(feature, checked as boolean)}
                    />
                    <Label htmlFor={feature} className="text-sm leading-tight">
                      {feature}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Overall Rating */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Overall Product Rating (optional)</Label>
              <div className="flex justify-center">
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRatingClick(value)}
                      className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-all p-2 rounded-lg hover:bg-gray-50"
                    >
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                        rating && rating >= value 
                          ? `border-2` 
                          : 'border-gray-300'
                      }`} style={{
                        borderColor: rating && rating >= value ? settings?.widget_color || '#10B981' : undefined,
                        backgroundColor: rating && rating >= value ? `${settings?.widget_color || '#10B981'}15` : undefined
                      }}>
                        <Star
                          className={`h-5 w-5 transition-colors ${
                            rating && rating >= value 
                              ? 'fill-current' 
                              : 'text-gray-400'
                          }`}
                          style={{ 
                            color: rating && rating >= value ? settings?.widget_color || '#10B981' : undefined 
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">{value}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground px-4">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>

            {/* Feedback Message */}
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
              <p className="text-xs text-muted-foreground">
                Be as specific as possible to help us understand and address your feedback
              </p>
            </div>

            <Button 
              type="submit" 
              disabled={!feedbackType || !feedback.trim() || isSubmitting || previewMode} 
              className="w-full" 
              size="lg"
              style={{ 
                backgroundColor: !feedbackType || !feedback.trim() || isSubmitting || previewMode 
                  ? undefined 
                  : settings?.widget_color || '#10B981' 
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : previewMode ? (
                'Preview Mode - Cannot Submit'
              ) : (
                'Submit Product Feedback'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductFeedbackForm;
