// src/pages/CSATForm.tsx
// Redesigned with better branding display

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, Star } from 'lucide-react';

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
  business_name?: string | null;
  logo_url?: string | null;
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
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [comments, setComments] = useState('');

  const ratingLabels = ['Very Poor', 'Poor', 'Average', 'Good', 'Excellent'];
  const ratingEmojis = ['😞', '🙁', '😐', '🙂', '😄'];

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

    try {
      const { data, error } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setIsValid(false);
        setValidationError('Project not found. Please check your survey link.');
        return;
      }

      if (!data.customer_satisfaction_enabled) {
        setIsValid(false);
        setValidationError('Customer satisfaction survey is currently disabled for this project.');
        return;
      }

      setSettings(data);
      setIsValid(true);
      setValidationError('');

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
        project_id: settings.project_id,
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

      const { error } = await supabase
        .from('feedback')
        .insert([feedbackData]);

      if (error) {
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-950 dark:to-indigo-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (!isValid && !previewMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-red-950 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">Survey Not Available</CardTitle>
            <CardDescription className="text-base">{validationError}</CardDescription>
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-900 dark:to-green-950 p-4">
        <Card className="w-full max-w-md shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-3xl">Thank You! 🎉</CardTitle>
            <CardDescription className="text-base">Your feedback has been submitted successfully.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.close()} className="w-full" size="lg">
              Close Window
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const containerClass = previewMode 
    ? "w-full p-4" 
    : "min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-950 dark:to-indigo-950 flex items-center justify-center p-4";

  return (
    <div className={containerClass}>
      <Card className="w-full max-w-2xl shadow-2xl border-0 overflow-hidden">
        {/* Header with Branding */}
        <div 
          className="relative pt-10 pb-8 px-8"
          style={{ 
            background: `linear-gradient(135deg, ${settings?.widget_color || '#3B82F6'}15 0%, ${settings?.widget_color || '#3B82F6'}05 100%)`
          }}
        >
          {/* Logo */}
          {settings?.logo_url && (
            <div className="flex justify-center mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 border-2 border-white dark:border-gray-700">
                <img
                  src={settings.logo_url}
                  alt="Business Logo"
                  className="h-16 w-auto object-contain max-w-[200px]"
                />
              </div>
            </div>
          )}
          
          {/* Business Name */}
          {settings?.business_name && (
            <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
              {settings.business_name}
            </h1>
          )}
          
          {/* Title & Description */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
              {settings?.widget_title || 'Customer Satisfaction Survey'}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {settings?.greeting_text || 'How satisfied are you with our service?'}
            </p>
          </div>

          {previewMode && (
            <div className="mt-6 text-center">
              <span className="inline-block px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm font-medium border border-orange-200 dark:border-orange-800">
                👁️ Preview Mode
              </span>
            </div>
          )}
        </div>

        {/* Form Content */}
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Rating Section */}
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Label className="text-xl font-semibold text-gray-900 dark:text-white block">
                  Rate Your Experience
                </Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Click on a star to rate us</p>
              </div>
              
              {/* Star Rating */}
              <div className="flex justify-center items-center gap-2 md:gap-3">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleRatingClick(value)}
                    onMouseEnter={() => setHoveredRating(value)}
                    onMouseLeave={() => setHoveredRating(null)}
                    className="group transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                  >
                    <Star
                      className="w-12 h-12 md:w-14 md:h-14 transition-all"
                      fill={(hoveredRating !== null ? value <= hoveredRating : rating !== null && value <= rating) 
                        ? settings?.widget_color || '#3B82F6' 
                        : 'none'}
                      stroke={(hoveredRating !== null ? value <= hoveredRating : rating !== null && value <= rating) 
                        ? settings?.widget_color || '#3B82F6' 
                        : '#D1D5DB'}
                      strokeWidth="2"
                    />
                  </button>
                ))}
              </div>

              {/* Rating Feedback */}
              {(rating !== null || hoveredRating !== null) && (
                <div className="text-center space-y-2 animate-in fade-in duration-300">
                  <div className="text-5xl">
                    {ratingEmojis[(hoveredRating || rating || 1) - 1]}
                  </div>
                  <p 
                    className="text-lg font-semibold"
                    style={{ color: settings?.widget_color || '#3B82F6' }}
                  >
                    {ratingLabels[(hoveredRating || rating || 1) - 1]}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Address <span className="text-gray-400">(Optional)</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-base"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                We'll only use this to follow up if needed
              </p>
            </div>

            {/* Comments Field */}
            <div className="space-y-2">
              <Label htmlFor="comments" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Additional Comments <span className="text-gray-400">(Optional)</span>
              </Label>
              <Textarea
                id="comments"
                placeholder="Tell us more about your experience..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="resize-none text-base"
              />
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={!rating || isSubmitting || previewMode} 
              className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              style={{
                backgroundColor: !rating || isSubmitting || previewMode 
                  ? undefined 
                  : settings?.widget_color || '#3B82F6',
                opacity: !rating || isSubmitting || previewMode ? 0.5 : 1
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Submitting...
                </>
              ) : previewMode ? (
                '👁️ Preview Mode - Cannot Submit'
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </form>
        </CardContent>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-800/50 px-8 py-4 text-center border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your feedback helps us improve our service
          </p>
        </div>
      </Card>
    </div>
  );
};

export default CustomerSatisfactionForm;
