import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageCircle, CheckCircle, AlertCircle, Loader2, Star, User, Mail } from 'lucide-react';
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
  message: string;
  email?: string;
}

const QRFeedbackPage = () => {
  const navigate = useNavigate();
  const { project_id } = useParams<{ project_id: string }>();
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Debug logging
  console.log('QRFeedbackPage rendered with project_id:', project_id);

  // Fetch project data
  useEffect(() => {
    const fetchProject = async () => {
      if (!project_id || typeof project_id !== 'string') {
        console.log('No valid project_id provided');
        setError('Invalid project ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Fetching project data for:', project_id);

        // First try to get project from feedback_settings table
        const { data: feedbackSettings, error: feedbackError } = await supabase
          .from('feedback_settings')
          .select('*')
          .eq('project_id', project_id)
          .single();

        console.log('Feedback settings query result:', { feedbackSettings, feedbackError });

        if (feedbackError && feedbackError.code !== 'PGRST116') {
          console.error('Error fetching feedback settings:', feedbackError);
          // Don't throw error, just use fallback
        }

        if (feedbackSettings) {
          console.log('Found feedback settings, setting project data');
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
        } else {
          console.log('No feedback settings found, using fallback project data');
          // If not found in feedback_settings, show generic project
          setProject({
            id: project_id,
            user_id: '',
            project_id: project_id,
            title: 'Feedback Form',
            brand_color: '#3b82f6',
            business_name: 'Our Business',
            business_logo: '',
            show_rating: true,
            show_contact_info: true,
            show_name: true,
            show_email: true
          });
        }

      } catch (err) {
        console.error('Error fetching project:', err);
        // Use fallback project data instead of showing error
        setProject({
          id: project_id,
          user_id: '',
          project_id: project_id,
          title: 'Feedback Form',
          brand_color: '#3b82f6',
          business_name: 'Our Business',
          business_logo: '',
          show_rating: true,
          show_contact_info: true,
          show_name: true,
          show_email: true
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [project_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields
    if (!rating || rating < 1) {
      toast.error('Please provide a rating.');
      return;
    }

    if (!customerName.trim()) {
      toast.error('Please enter your name.');
      return;
    }

    if (!customerEmail.trim()) {
      toast.error('Please enter your email.');
      return;
    }

    if (!feedback.trim()) {
      toast.error('Please provide additional comments.');
      return;
    }

    if (!project_id || typeof project_id !== 'string') {
      toast.error('Invalid project ID.');
      return;
    }

    setSubmitting(true);

    try {
      // Build message with rating if provided
      let message = feedback.trim();
      if (rating && rating > 0) {
        message = message ? `${message}\n\nRating: ${rating}/5` : `Rating: ${rating}/5`;
      }
      
      const feedbackData: FeedbackSubmission = {
        project_id: project_id,
        message: message || 'No message provided',
        email: customerEmail.trim() || undefined
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
        navigate('/feedback/thank-you');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Loading</h3>
                <p className="text-sm text-gray-600">Preparing your feedback form...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
                <p className="text-sm text-gray-600 mb-6">{error}</p>
                <Button 
                  onClick={() => navigate(-1)} 
                  variant="outline" 
                  className="w-full border-gray-300 hover:bg-gray-50"
                >
                  Go Back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
                <p className="text-gray-600 mb-4">
                  Your feedback has been submitted successfully. We appreciate your input!
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Redirecting to thank you page...</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
          {/* Header Section */}
          <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative">
              {/* Business Logo */}
              {project?.business_logo && (
                <div className="mb-4 flex justify-center">
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <img
                      src={project.business_logo}
                      alt={project.business_name || 'Business Logo'}
                      className="h-12 w-auto rounded-lg object-contain"
                    />
                  </div>
                </div>
              )}
              
              {/* Business Name */}
              {project?.business_name && (
                <div className="mb-3">
                  <h1 className="text-xl font-bold text-center">
                    {project.business_name}
                  </h1>
                </div>
              )}
              
              <div className="flex items-center justify-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold">
                  {project?.title || 'Share Your Feedback'}
                </h2>
              </div>
              
              <p className="text-blue-100 text-center text-sm">
                We value your opinion and would love to hear from you
              </p>
            </div>
          </div>
          
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Rating System */}
              {project?.show_rating && (
                <div className="space-y-4">
                  <div className="text-center">
                    <Label className="text-base font-semibold text-gray-800">
                      How would you rate your experience? <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <div className="flex justify-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-2 rounded-full transition-all duration-200 ${
                          rating && star <= rating
                            ? 'text-yellow-400 bg-yellow-50 scale-110'
                            : 'text-gray-300 hover:text-yellow-300 hover:bg-yellow-50 hover:scale-105'
                        }`}
                        disabled={submitting}
                      >
                        <Star className="h-8 w-8 fill-current" />
                      </button>
                    ))}
                  </div>
                  {rating && (
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">
                        You rated: <span className="text-yellow-600 font-bold">{rating}</span> out of 5 stars
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Contact Information */}
              {project?.show_contact_info && (
                <div className="space-y-6">
                  {project?.show_name && (
                    <div className="space-y-3">
                      <Label htmlFor="customerName" className="text-base font-semibold text-gray-800">
                        Your Name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="customerName"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Enter your full name"
                          className="pl-12 h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  )}

                  {project?.show_email && (
                    <div className="space-y-3">
                      <Label htmlFor="customerEmail" className="text-base font-semibold text-gray-800">
                        Your Email <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="customerEmail"
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="Enter your email address"
                          className="pl-12 h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Feedback Text */}
              <div className="space-y-3">
                <Label htmlFor="feedback" className="text-base font-semibold text-gray-800">
                   Comments <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us about your experience, suggestions, or any feedback you'd like to share..."
                  className="min-h-[140px] resize-none text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                  disabled={submitting}
                />
                <p className="text-sm text-gray-600">
                  Your feedback helps us improve our services
                </p>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={submitting || (!feedback.trim() && !rating)}
                  className="w-full h-14 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  style={{ 
                    backgroundColor: project?.brand_color || '#3b82f6',
                    borderColor: project?.brand_color || '#3b82f6'
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-5 w-5 mr-3" />
                      Send Feedback
                    </>
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Powered by NoteX • Your feedback is secure and private</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QRFeedbackPage;