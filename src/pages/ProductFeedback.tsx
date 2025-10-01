// src/pages/ProductFeedback.tsx
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
      const { data, error } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setIsValid(false);
        setValidationError('Project not found. Please check your feedback link.');
        return;
      }

      if (!data.product_feedback_enabled) {
        setIsValid(false);
        setValidationError('Product feedback is currently disabled for this project.');
        return;
      }

      setSettings(data);
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
        description: 'Please provide your feedback message',
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
        form_type: 'product_feedback',
        message: message.trim(),
        rating: rating || null,
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
      console.error('❌
