import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProjectId } from '@/hooks/useProjectId';

export interface FeedbackFormData {
  email?: string;
  message: string;
  rating?: number; // For CSAT forms only
}

export interface FeedbackSubmissionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface FeedbackFormState {
  isSubmitting: boolean;
  isValidating: boolean;
  projectId: string | null;
  isValid: boolean;
  error: string | null;
}

/**
 * Enhanced hook for CSAT and Product Feedback forms with dynamic project ID validation
 * and comprehensive metadata tracking
 */
export const useFeedbackForms = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { projectId, isValidating, isValid, error: projectIdError } = useProjectId();

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

  const validateFormData = (data: FeedbackFormData, formType: 'csat' | 'product'): string | null => {
    if (!data.message.trim()) {
      return 'Message is required';
    }

    if (formType === 'csat' && (!data.rating || data.rating < 1 || data.rating > 5)) {
      return 'Please select a rating between 1 and 5';
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return 'Please enter a valid email address';
    }

    return null;
  };

  const submitFeedback = async (
    data: FeedbackFormData, 
    formType: 'csat' | 'product'
  ): Promise<FeedbackSubmissionResult> => {
    if (isSubmitting) {
      return { success: false, error: 'Already submitting feedback' };
    }

    if (!projectId) {
      return { success: false, error: 'Project ID not found. Please ensure you have a valid project link.' };
    }

    // Validate form data
    const validationError = validateFormData(data, formType);
    if (validationError) {
      return { success: false, error: validationError };
    }

    setIsSubmitting(true);

    try {
      // Generate session ID for tracking
      const sessionId = generateSessionId();

      // Prepare metadata
      const metadata = {
        form_type: formType,
        page_url: window.location.href,
        browser: getBrowserInfo(),
        rating: data.rating || null,
        session_id: sessionId
      };

      // Prepare feedback content
      let content = data.message.trim();
      if (formType === 'csat' && data.rating) {
        content = `CSAT Rating: ${data.rating}/5\n\n${content}`;
      } else if (formType === 'product') {
        content = `Product Feedback\n\n${content}`;
      }

      // Submit to Supabase
      const { data: result, error } = await supabase
        .from('feedback')
        .insert({
          project_id: projectId,
          email: data.email?.trim() || null,
          message: content,
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
    isSubmitting,
    isValidating,
    projectId,
    isValid,
    error: projectIdError
  };
};