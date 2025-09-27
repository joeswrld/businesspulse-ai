import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FeedbackSubmissionData {
  projectId: string;
  email?: string;
  message: string;
  rating?: number; // For CSAT forms only
  formType: 'csat' | 'product';
  metadata?: Record<string, any>;
}

export interface FeedbackSubmissionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Hook for submitting feedback to Supabase with comprehensive error handling
 * and metadata tracking
 */
export const useFeedbackSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const generateSessionId = (): string => {
    return crypto.randomUUID();
  };

  const getBrowserInfo = () => {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().toISOString()
    };
  };

  const submitFeedback = async (data: FeedbackSubmissionData): Promise<FeedbackSubmissionResult> => {
    if (isSubmitting) {
      return { success: false, error: 'Already submitting feedback' };
    }

    setIsSubmitting(true);

    try {
      // Generate session ID for tracking
      const sessionId = generateSessionId();

      // Prepare metadata
      const metadata = {
        form_type: data.formType,
        page_url: window.location.href,
        browser: getBrowserInfo(),
        rating: data.rating || null,
        ...data.metadata
      };

      // Prepare feedback content
      let content = data.message;
      if (data.formType === 'csat' && data.rating) {
        content = `CSAT Rating: ${data.rating}/5\n\n${data.message}`;
      } else if (data.formType === 'product') {
        content = `Product Feedback\n\n${data.message}`;
      }

      // Submit to Supabase
      const { data: result, error } = await supabase
        .from('feedback')
        .insert({
          project_id: data.projectId,
          email: data.email?.trim() || null,
          message: content.trim(),
          metadata: metadata
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || 'Failed to submit feedback');
      }

      // Store session ID for potential future use
      sessionStorage.setItem('notex_session_id', sessionId);

      // Show success toast
      toast({
        title: 'Thank you!',
        description: 'Your feedback has been submitted successfully.',
      });

      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('Feedback submission error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit feedback';
      
      // Show error toast
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitFeedback,
    isSubmitting
  };
};