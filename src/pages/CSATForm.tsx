import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, Star, MessageSquare } from 'lucide-react';

interface CustomerSatisfactionFormProps {
  projectId?: string;
  previewMode?: boolean;
  onSubmitted?: (data: any) => void;
}

interface FeedbackSettings {
  id: string;
  project_id: string;
  user_id: string;
  widget_title: string;
  widget_color: string;
  greeting_text: string;
  customer_satisfaction_enabled: boolean;
}

const CustomerSatisfactionForm: React.FC<CustomerSatisfactionFormProps> = ({
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

  const [rating, setRating] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (projectId && !previewMode) {
      validateProject();
    } else if (previewMode) {
      setSettings({
        id: 'preview',
        project_id: projectId || 'preview',
        user_id: 'preview',
        widget_title: 'Customer Satisfaction Survey',
        widget_color: '#3B82F6',
        greeting_text: 'How satisfied are you with our service?',
        customer_satisfaction_enabled: true
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
    console.log('🔍 Validating project ID:', projectId);

    try {
      // Query feedback_settings by project_id
      const { data, error } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      console.log('📊 Query result:', { data, error });

      if (error) {
        console.error('❌ Validation error:', error);
        throw error;
      }

      if (!data) {
        setIsValid(false);
        setValidationError('Project not found. Please check your survey link.');
        console.log('❌ No feedback_settings found for project_id:', projectId);
        return;
      }

      // Check if customer satisfaction is enabled
      if (!data.customer_satisfaction_enabled) {
        setIsValid(false);
        setValidationError('Customer satisfaction survey is currently disabled for this project.');
        console.log('❌ Customer satisfaction disabled for project');
        return;
      }

      setSettings(data);
      setIsValid(true);
      setValidationError('');
      console.log('✅ Project validated successfully:', data);

    } catch (err) {
      console.error('❌ Error validating project:', err);
      setIsValid(false);
      setValidationError('Unable to load survey. Please try again later.');
    } finally {
      setIsValidating(false);
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

    if (!rating) {
      toast({
        title: 'Rating Required',
        description: 'Please select a satisfaction rating',
        variant: 'destructive'
      });
      return;
    }

    if (!settings?.project_id) {
      toast({
        title: 'Invalid Project',
        description: 'Cannot submit feedback for this project.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackData = {
        project_id: settings.project_id, // Use project_id from feedback_settings
        form_type: 'customer_satisfaction',
        message: comments.trim() || `Customer satisfaction rating: ${rating}/5`,
        rating: rating,
        metadata: {
          email: email.trim() || null,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      };

      console.log('📤 Submitting feedback:', feedbackData);

      const { error } = await supabase
        .from('feedback')
        .insert([feedbackData]);

      if (error) {
        console.error('❌ Error submitting feedback:', error);
        
        let errorMessage = 'Failed to submit feedback.';
        if (error.code === '23503') {
          errorMessage = 'Invalid project reference. Please contact support.';
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

      console.log('✅ Feedback submitted successfully');
      setIsSubmitted(true);
      
      if (onSubmitted) {
        onSubmitted(feedbackData);
      }
      
      toast({
        title: 'Thank you!',
        description: 'Your feedback has been submitted successfully.'
      });
    } catch (err) {
      console.error('❌ Submit failed:', err);
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
          <p className="text-muted-foreground">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (!isValid && !previewMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-xl">Survey Not Available</CardTitle>
            <CardDescription className="text-base mt-2">{validationError}</CardDescription>
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
            <CardDescription>Your satisfaction rating has been recorded.</CardDescription>
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
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <MessageSquare 
              className="h-8 w-8 mr-2" 
              style={{ color: settings?.widget_color || '#3B82F6' }}
            />
            <CardTitle className="text-2xl">
              {settings?.widget_title || 'Customer Satisfaction Survey'}
            </CardTitle>
          </div>
          <CardDescription>
            {settings?.greeting_text || 'How satisfied are you with our service?'}
          </CardDescription>
          {previewMode && (
            <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
              Preview Mode - Form will not submit
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-medium">
                How satisfied are you with our service? *
              </Label>
              <div className="flex justify-center">
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRatingClick(value)}
                      className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-all p-2 rounded-lg hover:bg-gray-50"
                    >
                      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors ${
                        rating && rating >= value 
                          ? `border-2` 
                          : 'border-gray-300'
                      }`} style={{
                        borderColor: rating && rating >= value ? settings?.widget_color || '#3B82F6' : undefined,
                        backgroundColor: rating && rating >= value ? `${settings?.widget_color || '#3B82F6'}15` : undefined
                      }}>
                        <Star
                          className={`h-6 w-6 transition-colors ${
                            rating && rating >= value 
                              ? 'fill-current' 
                              : 'text-gray-400'
                          }`}
                          style={{ 
                            color: rating && rating >= value ? settings?.widget_color || '#3B82F6' : undefined 
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground mt-1">{value}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground px-4">
                <span>Very Dissatisfied</span>
                <span>Very Satisfied</span>
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
              <p className="text-xs text-muted-foreground">
                We'll only use this to follow up if needed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Additional Comments (optional)</Label>
              <Textarea
                id="comments"
                placeholder="Tell us more about your experience..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <Button 
              type="submit" 
              disabled={!rating || isSubmitting || previewMode} 
              className="w-full" 
              size="lg"
              style={{ 
                backgroundColor: !rating || isSubmitting || previewMode 
                  ? undefined 
                  : settings?.widget_color || '#3B82F6' 
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
                'Submit Feedback'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerSatisfactionForm;
