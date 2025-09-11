import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';

interface FeedbackFormData {
  name: string;
  email: string;
  message: string;
}

const EmailSignatureFeedbackForm = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [formData, setFormData] = useState<FeedbackFormData>({
    name: '',
    email: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectSettings, setProjectSettings] = useState<any>(null);

  // Load project settings
  useEffect(() => {
    const loadProjectSettings = async () => {
      if (!projectId) return;

      try {
        const { data, error } = await supabase
          .from('feedback_settings')
          .select('*')
          .eq('project_id', projectId)
          .single();

        if (error) {
          console.error('Error loading project settings:', error);
          // Continue with default settings
          setProjectSettings({
            title: 'Share Your Feedback',
            show_name: true,
            show_email: true,
            button_text: 'Send Feedback',
            theme: 'light',
            brand_color: '#2563eb'
          });
        } else {
          setProjectSettings(data);
        }
      } catch (err) {
        console.error('Error loading project settings:', err);
        // Use default settings
        setProjectSettings({
          title: 'Share Your Feedback',
          show_name: true,
          show_email: true,
          button_text: 'Send Feedback',
          theme: 'light',
          brand_color: '#2563eb'
        });
      }
    };

    loadProjectSettings();
  }, [projectId]);

  const handleInputChange = (field: keyof FeedbackFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectId) {
      setError('Project ID is missing');
      return;
    }

    if (!formData.message.trim()) {
      setError('Please enter your feedback message');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use the safe insert function
      const { data, error } = await supabase.rpc('insert_feedback_safe', {
        p_project_id: projectId,
        p_channel: 'email_signature',
        p_name: formData.name.trim() || null,
        p_email: formData.email.trim() || null,
        p_message: formData.message.trim()
      });

      if (error) {
        console.error('Error submitting feedback:', error);
        throw new Error(error.message);
      }

      console.log('Feedback submitted successfully:', data);
      setSubmitted(true);
      toast.success('Thank you for your feedback!');
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        message: ''
      });

    } catch (err) {
      console.error('Failed to submit feedback:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit feedback';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h2 className="text-xl font-semibold mb-2">Invalid Project</h2>
              <p className="text-gray-600">Project ID is missing from the URL.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
              <p className="text-gray-600 mb-4">Your feedback has been submitted successfully.</p>
              <Button 
                onClick={() => setSubmitted(false)}
                variant="outline"
                className="w-full"
              >
                Submit Another Feedback
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Mail className="h-8 w-8 text-blue-600 mr-2" />
            <CardTitle className="text-2xl">
              {projectSettings?.title || 'Share Your Feedback'}
            </CardTitle>
          </div>
          <CardDescription>
            Click the link from an email signature to leave feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {projectSettings?.show_name && (
              <div>
                <Label htmlFor="name">Name (Optional)</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Your name"
                  className="mt-1"
                />
              </div>
            )}

            {projectSettings?.show_email && (
              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="message">Feedback Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="Tell us what you think..."
                className="mt-1 min-h-[100px]"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={loading || !formData.message.trim()}
              className="w-full"
              style={{
                backgroundColor: projectSettings?.brand_color || '#2563eb'
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {projectSettings?.button_text || 'Send Feedback'}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailSignatureFeedbackForm;