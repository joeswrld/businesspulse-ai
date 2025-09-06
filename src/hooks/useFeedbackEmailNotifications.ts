import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FeedbackNotification {
  feedback_id: string;
  user_id: string;
  project_id: string;
  message: string;
  name?: string;
  email?: string;
  timestamp: string;
  action: string;
}

export const useFeedbackEmailNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to new feedback notifications
    const channel = supabase
      .channel('feedback_notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('New feedback notification received:', payload);
          
          if (payload.eventType === 'INSERT') {
            const feedbackData = payload.new as FeedbackNotification;
            
            // Call the Edge Function to send email
            try {
              const session = await supabase.auth.getSession();
              if (!session.data.session?.access_token) {
                console.error('No valid session found for email notification');
                return;
              }

              const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-feedback-email`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.data.session.access_token}`,
                },
                body: JSON.stringify({
                  feedback_id: feedbackData.feedback_id,
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
        }
      )
      .subscribe((status) => {
        console.log('Feedback notification subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
};