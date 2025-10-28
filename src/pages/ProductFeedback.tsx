// src/pages/ProductFeedback.tsx
// Public form - Always available (No access restrictions)

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
import { z } from 'zod';

// Input validation schema
const feedbackSchema = z.object({
  email: z.string().email().max(255).optional().or(z.literal('')),
  message: z.string().trim().min(1, 'Message is required').max(2000, 'Message must be less than 2000 characters'),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  projectId: z.string().uuid()
});

interface ProductFeedbackFormProps {
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
  product_feedback_enabled: boolean;
  business_name?: string | null;
  logo_url?: string | null;
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
  const [lastSubmit, setLastSubmit] = useState<number>(0);

  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const ratingLabels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  useEffect(() => {
    if (projectId && !previewMode) {
      validateProject();
    } else if (previewMode) {
      setSettings({
        id: 'preview',
        project_id: projectId || 'preview',
        user_id: 'preview',
        widget_title: 'Product Feedback',
        widget_color: '#8B5CF6',
        greeting_text: 'Share your thoughts about our product',
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

    try {
      const { data: settingsData, error: settingsError } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (!settingsData) {
        setIsValid(false);
        setValidationError('Project not found. Please check your feedback link.');
        return;
      }

      if (!settingsData.product_feedback_enabled) {
        setIsValid(false);
        setValidationError('Product feedback is currently disabled for this project.');
        return;
      }

      setSettings(settingsData);
      setIsValid(true);
      setValidationError('');

    } catch (err) {
      console.error('❌ Error validating project:', err);
      setIsValid(false);
      setValidationError('Unable to load feedback form. Please try again later.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Rate limiting check
    if (Date.now() - lastSubmit < 5000) {
      toast({
        title: 'Too Fast',
        description: 'Please wait before submitting again',
        variant: 'destructive',
      });
      return;
    }

    if (previewMode) {
      toast({
        title: 'Preview Mode',
        description: 'This is a preview. Feedback will not be submitted.',
        variant: 'default'
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: 'Message Required',
        description: 'Please enter your feedback',
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
      // Validate input with zod
      const validated = feedbackSchema.parse({
        email: email.trim(),
        message: message.trim(),
        rating: rating,
        projectId: settings.project_id
      });
      
      const feedbackData = {
        project_id: validated.projectId,
        form_type: 'product_feedback',
        message: validated.message,
        rating: validated.rating,
        metadata: {
          email: validated.email || null,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      };

      const { error } = await supabase.from('feedback').insert([feedbackData]);

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
      setLastSubmit(Date.now());

      if (onSubmitted) {
        onSubmitted(feedbackData);
      }

      toast({
        title: 'Thank you!',
        description: 'Your feedback has been submitted successfully.'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Invalid Input',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        console.error('❌ Submit failed:', error);
        toast({
          title: 'Error',
          description: 'Failed to submit feedback. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-950 dark:to-purple-950">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading feedback form...</p>
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
            <CardTitle className="text-2xl">Feedback Form Not Available</CardTitle>
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
            <CardDescription className="text-base">Your product feedback has been recorded.</CardDescription>
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
    : "min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-950 dark:to-purple-950 flex items-center justify-center p-4";

  return (
    <div className={containerClass}>
      <Card className="w-full max-w-2xl shadow-2xl border-0 overflow-hidden">
        <div 
          className="relative pt-10 pb-8 px-8"
          style={{ 
            background: `linear-gradient(135deg, ${settings?.widget_color || '#8B5CF6'}15 0%, ${settings?.widget_color || '#8B5CF6'}05 100%)`
          }}
        >
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
          
          {settings?.business_name && (
            <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
              {settings.business_name}
            </h1>
          )}
          
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
              {settings?.widget_title || 'Product Feedback'}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {settings?.greeting_text || 'Share your thoughts about our product'}
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

        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="message" className="text-base font-semibold text-gray-900 dark:text-white">
                Your Feedback <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="message"
                placeholder="Tell us what you think about our product, features, or any suggestions for improvement..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="resize-none text-base"
                required
                maxLength={2000}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {message.length}/2000 characters
              </p>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-medium text-gray-900 dark:text-white">
                  How would you rate our product? <span className="text-gray-400">(Optional)</span>
                </Label>
              </div>
              
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
                        ? settings?.widget_color || '#8B5CF6' 
                        : 'none'}
                      stroke={(hoveredRating !== null ? value <= hoveredRating : rating !== null && value <= rating) 
                        ? settings?.widget_color || '#8B5CF6' 
                        : '#D1D5DB'}
                      strokeWidth="2"
                    />
                  </button>
                ))}
              </div>

              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 px-4">
                <span>Poor</span>
                <span>Excellent</span>
              </div>

              {(rating !== null || hoveredRating !== null) && (
                <div className="text-center animate-in fade-in duration-300">
                  <p 
                    className="text-lg font-semibold"
                    style={{ color: settings?.widget_color || '#8B5CF6' }}
                  >
                    {ratingLabels[(hoveredRating || rating || 1) - 1]}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700"></div>

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
                maxLength={255}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                We'll only use this to follow up if needed
              </p>
            </div>

            <Button 
              type="submit" 
              disabled={!message.trim() || isSubmitting || previewMode} 
              className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              style={{
                backgroundColor: !message.trim() || isSubmitting || previewMode 
                  ? undefined 
                  : settings?.widget_color || '#8B5CF6',
                opacity: !message.trim() || isSubmitting || previewMode ? 0.5 : 1
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

        <div className="bg-gray-50 dark:bg-gray-800/50 px-8 py-4 text-center border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your feedback helps us improve our service
          </p>
        </div>

        <div className="bg-gray-100 dark:bg-gray-900/50 px-4 py-3 text-center border-t border-gray-200 dark:border-gray-700">
          <a 
            href="https://notex.com.ng/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Powered by <span className="font-semibold">NoteX</span>
          </a>
        </div>
      </Card>
    </div>
  );
};

export default ProductFeedbackForm;