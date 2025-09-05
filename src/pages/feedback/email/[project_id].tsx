import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle, AlertCircle, Loader2, Star, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ProjectData {
  id: string;
  user_id: string;
  project_id: string;
  title?: string;
  brand_color?: string;
  business_name?: string;
  business_logo?: string;
  show_rating?: boolean;
  show_contact_info?: boolean;
  show_name?: boolean;
  show_email?: boolean;
}

interface FeedbackSubmission {
  project_id: string;
  channel: string;
  message: string;
  rating?: number;
  customer_name?: string;
  customer_email?: string;
}

const EmailFeedbackPage = () => {
  const router = useRouter();
  const { project_id } = router.query;
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Fetch project data
  useEffect(() => {
    const fetchProject = async () => {
      if (!project_id || typeof project_id !== 'string') return;

      try {
        setLoading(true);
        setError(null);

        // First try to get project from feedback_settings table
        const { data: feedbackSettings, error: feedbackError } = await supabase
          .from('feedback_settings')
          .select('*')
          .eq('project_id', project_id)
          .single();

        if (feedbackError && feedbackError.code !== 'PGRST116') {
          console.error('Error fetching feedback settings:', feedbackError);
          throw new Error('Failed to fetch project information');
        }

        if (feedbackSettings) {
          setProject({
            id: feedbackSettings.id,
            user_id: feedbackSettings.user_id,
            project_id: feedbackSettings.project_id,
            title: feedbackSettings.title || 'Feedback Form',
            brand_color: feedbackSettings.brand_color || '#3b82f6',
            business_name: feedbackSettings.business_name,
            business_logo: feedbackSettings.business_logo,
            show_rating: feedbackSettings.show_rating !== false,
            show_contact_info: feedbackSettings.show_contact_info !== false,
            show_name: feedbackSettings.show_name,
            show_email: feedbackSettings.show_email
          });
          return;
        }

        // If not found in feedback_settings, show generic project
        setProject({
          id: project_id,
          user_id: '',
          project_id: project_id,
          title: 'Feedback Form',
          brand_color: '#3b82f6'
        });

      } catch (err) {
        console.error('Error fetching project:', err);
        setError('Project not found. Please check the link and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [project_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback.trim() && !rating) {
      toast.error('Please provide either a rating or written feedback.');
      return;
    }

    if (!project_id || typeof project_id !== 'string') {
      toast.error('Invalid project ID.');
      return;
    }

    setSubmitting(true);

    try {
      const feedbackData: FeedbackSubmission = {
        project_id: project_id,
        channel: 'email',
        message: feedback.trim() || `Rating: ${rating}/5`,
        rating: rating || undefined,
        customer_name: customerName.trim() || undefined,
        customer_email: customerEmail.trim() || undefined
      };

      const { data, error } = await supabase
        .from('feedbacks')
        .insert([feedbackData])
        .select()
        .single();

      if (error) {
        console.error('Error submitting feedback:', error);
        throw new Error('Failed to submit feedback. Please try again.');
      }

      console.log('Feedback submitted successfully:', data);
      setSubmitted(true);
      toast.success('Thank you! Your feedback has been submitted.');

      // Redirect to thank you page after 3 seconds
      setTimeout(() => {
        router.push('/feedback/thank-you');
      }, 3000);

    } catch (err) {
      console.error('Error submitting feedback:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-gray-600">Loading feedback form...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => router.back()} 
              variant="outline" 
              className="w-full mt-4"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
            <p className="text-gray-600 mb-4">
              Your feedback has been submitted successfully. We appreciate your input!
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to thank you page...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            {/* Business Logo */}
            {project?.business_logo && (
              <div className="flex justify-center mb-4">
                <img
                  src={project.business_logo}
                  alt={project.business_name || 'Business Logo'}
                  className="h-16 w-16 object-contain"
                />
              </div>
            )}
            
            {/* Business Name */}
            {project?.business_name && (
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {project.business_name}
                </h2>
              </div>
            )}
            
            <div className="flex items-center justify-center mb-4">
              <Mail 
                className="h-8 w-8" 
                style={{ color: project?.brand_color || '#3b82f6' }}
              />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {project?.title || 'Share Your Feedback'}
            </CardTitle>
            <CardDescription className="text-gray-600">
              Quick feedback from your email - tell us how we're doing
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Quick Rating */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Quick Rating (Optional)
                </Label>
                <div className="flex justify-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-1 transition-colors ${
                        rating && star <= rating
                          ? 'text-yellow-400'
                          : 'text-gray-300 hover:text-yellow-300'
                      }`}
                      disabled={submitting}
                    >
                      <Star className="h-8 w-8 fill-current" />
                    </button>
                  ))}
                </div>
                {rating && (
                  <p className="text-center text-sm text-gray-600">
                    You rated: {rating} out of 5 stars
                  </p>
                )}
              </div>

              {/* Contact Information */}
              {project?.show_contact_info && (
                <div className="space-y-4">
                  {project?.show_name && (
                    <div className="space-y-2">
                      <Label htmlFor="customerName" className="text-sm font-medium text-gray-700">
                        Your Name (Optional)
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="customerName"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Enter your name"
                          className="pl-10"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  )}

                  {project?.show_email && (
                    <div className="space-y-2">
                      <Label htmlFor="customerEmail" className="text-sm font-medium text-gray-700">
                        Your Email (Optional)
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="customerEmail"
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="pl-10"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Written Feedback */}
              <div className="space-y-2">
                <Label htmlFor="feedback" className="text-sm font-medium text-gray-700">
                  Additional Comments (Optional)
                </Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Any additional thoughts or suggestions..."
                  className="min-h-[100px] resize-none"
                  disabled={submitting}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || (!feedback.trim() && !rating)}
                className="w-full"
                style={{ 
                  backgroundColor: project?.brand_color || '#3b82f6',
                  borderColor: project?.brand_color || '#3b82f6'
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Feedback
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Powered by NoteX • Your feedback is secure and private
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailFeedbackPage;