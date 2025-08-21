import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TestFeedbackSubmission = () => {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('Test User');
  const [email, setEmail] = useState('test@example.com');
  const [message, setMessage] = useState('This is a test feedback message');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProjectId, setUserProjectId] = useState('');

  // Load user's project ID
  React.useEffect(() => {
    if (user) {
      const loadUserProjectId = async () => {
        const { data, error } = await supabase
          .from('feedback_settings')
          .select('project_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (data && data.length > 0) {
          setUserProjectId(data[0].project_id);
          setProjectId(data[0].project_id);
        }
      };
      loadUserProjectId();
    }
  }, [user]);

  const submitFeedback = async () => {
    if (!projectId || !message) {
      toast.error('Project ID and message are required');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Submitting feedback:', { projectId, name, email, message });

      // Method 1: Direct database insert
      const { data: directResult, error: directError } = await supabase
        .from('feedbacks')
        .insert({
          project_id: projectId,
          name: name || null,
          email: email || null,
          message: message,
          status: 'new'
        })
        .select()
        .single();

      if (directError) {
        console.error('Direct insert error:', directError);
        throw directError;
      }

      console.log('Direct insert success:', directResult);
      toast.success('Feedback submitted directly to database!');

      // Method 2: API call (optional)
      const formData = new FormData();
      formData.append('project_id', projectId);
      formData.append('name', name);
      formData.append('email', email);
      formData.append('message', message);

      const apiResponse = await fetch('/api/feedback-api', {
        method: 'POST',
        body: formData
      });

      const apiResult = await apiResponse.json();
      console.log('API response:', apiResult);

      if (apiResponse.ok) {
        toast.success('Feedback also submitted via API!');
      } else {
        toast.error('API submission failed: ' + apiResult.error);
      }

      // Clear form
      setMessage('This is a test feedback message');
      
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkFeedbacks = async () => {
    if (!projectId) {
      toast.error('Please enter a project ID');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('project_id', projectId)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error checking feedbacks:', error);
        toast.error('Error checking feedbacks: ' + error.message);
        return;
      }

      console.log('Feedbacks for project', projectId, ':', data);
      toast.success(`Found ${data.length} feedback(s) for project ${projectId}`);
    } catch (error) {
      console.error('Error checking feedbacks:', error);
      toast.error('Error checking feedbacks: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Test Feedback Submission</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="projectId">Project ID</Label>
            <Input
              id="projectId"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Enter project ID"
            />
            {userProjectId && (
              <p className="text-sm text-gray-500 mt-1">
                Your project ID: {userProjectId}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter feedback message"
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={submitFeedback}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
            <Button 
              onClick={checkFeedbacks}
              variant="outline"
            >
              Check Feedbacks
            </Button>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ol className="text-sm space-y-1">
              <li>1. Enter your project ID (or use the auto-filled one)</li>
              <li>2. Fill in the feedback details</li>
              <li>3. Click "Submit Feedback" to test direct database insert</li>
              <li>4. Click "Check Feedbacks" to see existing feedbacks</li>
              <li>5. Go to the Feedback page to see if real-time updates work</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestFeedbackSubmission;