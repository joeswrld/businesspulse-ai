import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bug, 
  Lightbulb, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle, 
  Mail, 
  Upload,
  X,
  AlertTriangle,
  Info,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ProductFeedbackFormProps {
  projectId: string;
  onSubmit?: (data: any) => void;
  className?: string;
}

interface FormData {
  feedbackType: string;
  priority: string;
  message: string;
  email: string;
  attachments: File[];
}

const feedbackTypes = [
  { value: 'bug', label: 'Bug Report', icon: Bug, color: 'bg-red-100 text-red-800' },
  { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'bg-blue-100 text-blue-800' },
  { value: 'general', label: 'General Feedback', icon: MessageSquare, color: 'bg-green-100 text-green-800' },
  { value: 'other', label: 'Other', icon: Info, color: 'bg-gray-100 text-gray-800' }
];

const priorityLevels = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
];

export default function ProductFeedbackForm({ 
  projectId, 
  onSubmit,
  className 
}: ProductFeedbackFormProps) {
  const [formData, setFormData] = useState<FormData>({
    feedbackType: '',
    priority: 'medium',
    message: '',
    email: '',
    attachments: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      
      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large. Maximum size is 5MB.`);
        return false;
      }
      
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File ${file.name} is not a supported image format.`);
        return false;
      }
      
      return true;
    });

    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...validFiles]
    }));
  };

  const removeAttachment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.feedbackType) {
      newErrors.feedbackType = 'Please select a feedback type';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Please provide a detailed description';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // Upload attachments if any
      let attachmentUrls: string[] = [];
      if (formData.attachments.length > 0) {
        // In a real implementation, you would upload files to a storage service
        // For now, we'll just store the file names
        attachmentUrls = formData.attachments.map(file => file.name);
      }

      const feedbackData = {
        project_id: projectId,
        form_type: 'product_feedback',
        message: formData.message,
        metadata: {
          feedback_type: formData.feedbackType,
          priority: formData.priority,
          email: formData.email || null,
          attachments: attachmentUrls,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      };

      // Submit to Edge Function via Supabase SDK
      const { data, error } = await supabase.functions.invoke('widget-feedback', {
        body: feedbackData,
      });

      if (error) {
        throw new Error(error.message || 'Failed to submit feedback');
      }

      setSubmitted(true);
      toast.success('Thank you for your feedback!');
      
      if (onSubmit) {
        onSubmit(feedbackData);
      }

      // Reset form after a delay
      setTimeout(() => {
        setFormData({
          feedbackType: '',
          priority: 'medium',
          message: '',
          email: '',
          attachments: []
        });
        setSubmitted(false);
      }, 3000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedFeedbackType = feedbackTypes.find(type => type.value === formData.feedbackType);
  const selectedPriority = priorityLevels.find(priority => priority.value === formData.priority);

  if (submitted) {
    return (
      <Card className={cn("w-full max-w-md mx-auto", className)}>
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-700 mb-2">
            Thank You!
          </h3>
          <p className="text-gray-600">
            Your feedback has been submitted successfully. We'll review it and get back to you if needed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bug className="h-5 w-5 text-blue-500" />
          <span>Product Feedback</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Feedback Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              What type of feedback is this? <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.feedbackType} onValueChange={(value) => handleInputChange('feedbackType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select feedback type" />
              </SelectTrigger>
              <SelectContent>
                {feedbackTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center space-x-2">
                      <type.icon className="h-4 w-4" />
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFeedbackType && (
              <Badge className={selectedFeedbackType.color}>
                <selectedFeedbackType.icon className="h-3 w-3 mr-1" />
                {selectedFeedbackType.label}
              </Badge>
            )}
            {errors.feedbackType && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.feedbackType}
              </p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Priority Level</Label>
            <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityLevels.map((priority) => (
                  <SelectItem key={priority.value} value={priority.value}>
                    <div className="flex items-center space-x-2">
                      {priority.value === 'urgent' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      {priority.value === 'high' && <Zap className="h-4 w-4 text-orange-500" />}
                      {priority.value === 'medium' && <Info className="h-4 w-4 text-yellow-500" />}
                      {priority.value === 'low' && <Info className="h-4 w-4 text-gray-500" />}
                      <span>{priority.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPriority && (
              <Badge className={selectedPriority.color}>
                {selectedPriority.label} Priority
              </Badge>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Detailed Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder={
                formData.feedbackType === 'bug' 
                  ? "Describe the bug, steps to reproduce, and expected vs actual behavior..."
                  : formData.feedbackType === 'feature'
                  ? "Describe the feature you'd like to see and how it would help..."
                  : "Tell us about your feedback in detail..."
              }
              rows={5}
              className="resize-none"
            />
            {errors.message && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.message}
              </p>
            )}
          </div>

          {/* File Attachments */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Attachments (Optional)</Label>
            <div className="space-y-2">
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500">
                Upload screenshots or images (max 5MB each, JPG/PNG/GIF/WebP)
              </p>
              
              {formData.attachments.length > 0 && (
                <div className="space-y-1">
                  {formData.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium flex items-center">
              <Mail className="h-4 w-4 mr-1" />
              Email (Optional)
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="your@email.com"
            />
            <p className="text-xs text-gray-500">
              We'll use this to follow up on your feedback if needed
            </p>
            {errors.email && (
              <p className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !formData.feedbackType || !formData.message.trim()}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}