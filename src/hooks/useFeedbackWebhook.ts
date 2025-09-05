import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FeedbackWebhookData {
  feedback_id: string;
  user_id: string;
  project_id: string;
  message: string;
  name?: string;
  email?: string;
  timestamp: string;
  action: string;
}

export const useFeedbackWebhook = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    console.log('Setting up feedback webhook listener for user:', user.id);

    // Subscribe to feedback notifications
    const channel = supabase
      .channel('feedback_webhook')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feedback',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('Feedback webhook received:', payload);
          
          const feedbackData = payload.new as FeedbackWebhookData;
          
          // Call the Edge Function to send email
          try {
            const session = await supabase.auth.getSession();
            if (!session.data.session?.access_token) {
              console.error('No valid session found for email notification');
              return;
            }

            console.log('Calling send-feedback-email Edge Function...');

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-feedback-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.data.session.access_token}`,
              },
              body: JSON.stringify({
                feedback_id: feedbackData.id,
                user_id: feedbackData.user_id,
                project_id: feedbackData.project_id,
                message: feedbackData.message,
                name: feedbackData.name,
                email: feedbackData.email,
                timestamp: feedbackData.timestamp,
              }),
            });

            if (response.ok) {
              const result = await response.json();
              console.log('Email notification sent successfully:', result);
            } else {
              const error = await response.json();
              console.error('Failed to send email notification:', error);
            }
          } catch (error) {
            console.error('Error calling email notification function:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('Feedback webhook subscription status:', status);
      });

    return () => {
      console.log('Cleaning up feedback webhook listener');
      supabase.removeChannel(channel);
    };
  }, [user]);
};