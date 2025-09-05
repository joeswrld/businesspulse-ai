import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FeedbackNotification {
  newCount: number;
  totalCount: number;
  loading: boolean;
  error: string | null;
}

export const useFeedbackNotifications = () => {
  const { user } = useAuth();
  const [notification, setNotification] = useState<FeedbackNotification>({
    newCount: 0,
    totalCount: 0,
    loading: true,
    error: null
  });

  const fetchFeedbackCount = async () => {
    if (!user) {
      setNotification(prev => ({ ...prev, loading: false, newCount: 0, totalCount: 0 }));
      return;
    }

    try {
      setNotification(prev => ({ ...prev, loading: true, error: null }));

      // Get user's project IDs from feedback_settings
      const { data: settings, error: settingsError } = await supabase
        .from('feedback_settings')
        .select('project_id')
        .eq('user_id', user.id);

      if (settingsError) {
        throw settingsError;
      }

      if (!settings || settings.length === 0) {
        setNotification(prev => ({ 
          ...prev, 
          loading: false, 
          newCount: 0, 
          totalCount: 0 
        }));
        return;
      }

      const projectIds = settings.map(s => s.project_id);

      // Get total feedback count
      const { count: totalCount, error: totalError } = await supabase
        .from('feedbacks')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds);

      if (totalError) {
        throw totalError;
      }

      // Get new feedback count (status = 'new')
      const { count: newCount, error: newError } = await supabase
        .from('feedbacks')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('status', 'new');

      if (newError) {
        throw newError;
      }

      setNotification({
        newCount: newCount || 0,
        totalCount: totalCount || 0,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Error fetching feedback notifications:', error);
      setNotification(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch notifications'
      }));
    }
  };

  const markAsRead = async (feedbackIds: string[]) => {
    if (!user || feedbackIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('feedbacks')
        .update({ status: 'reviewed' })
        .in('id', feedbackIds);

      if (error) {
        throw error;
      }

      // Refresh the count after marking as read
      await fetchFeedbackCount();
    } catch (error) {
      console.error('Error marking feedback as read:', error);
    }
  };

  const markAsResolved = async (feedbackIds: string[]) => {
    if (!user || feedbackIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('feedbacks')
        .update({ status: 'resolved' })
        .in('id', feedbackIds);

      if (error) {
        throw error;
      }

      // Refresh the count after marking as resolved
      await fetchFeedbackCount();
    } catch (error) {
      console.error('Error marking feedback as resolved:', error);
    }
  };

  useEffect(() => {
    fetchFeedbackCount();

    // Set up real-time subscription for feedback changes
    const channel = supabase
      .channel('feedback-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedbacks'
        },
        () => {
          // Refresh count when feedback changes
          fetchFeedbackCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    ...notification,
    refresh: fetchFeedbackCount,
    markAsRead,
    markAsResolved
  };
};