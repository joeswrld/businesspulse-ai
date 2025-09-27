import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Feedback {
  id: string;
  project_id: string;
  email: string | null;
  message: string;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  metadata: any;
  created_at: string;
}

interface FeedbackCounts {
  total: number;
  new: number;
  reviewed: number;
  resolved: number;
}

export const useRealtimeFeedback = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [counts, setCounts] = useState<FeedbackCounts>({
    total: 0,
    new: 0,
    reviewed: 0,
    resolved: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const { user } = useAuth();

  const loadFeedbacks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // First get the user's project IDs from feedback_settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('feedback_settings')
        .select('id')
        .eq('user_id', user.id);

      if (settingsError) {
        console.error('Error fetching feedback settings:', settingsError);
        setError(settingsError.message);
        return;
      }

      if (!settingsData || settingsData.length === 0) {
        setFeedbacks([]);
        setCounts({ total: 0, new: 0, reviewed: 0, resolved: 0 });
        return;
      }

      const projectIds = settingsData.map(s => s.id);

      // Fetch feedbacks from the feedback table using project IDs
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });

      if (feedbackError) {
        console.error('Error fetching feedbacks:', feedbackError);
        setError(feedbackError.message);
        return;
      }

      const feedbacks = feedbackData || [];
      setFeedbacks(feedbacks);

      // Calculate counts based on sentiment
      const positiveCount = feedbacks.filter(f => f.sentiment === 'positive').length;
      const negativeCount = feedbacks.filter(f => f.sentiment === 'negative').length;
      const neutralCount = feedbacks.filter(f => f.sentiment === 'neutral').length;
      const unknownCount = feedbacks.filter(f => !f.sentiment).length;

      setCounts({
        total: feedbacks.length,
        new: unknownCount, // Treat unknown sentiment as new
        reviewed: positiveCount + negativeCount + neutralCount,
        resolved: 0 // No resolved status in new schema
      });

    } catch (err) {
      console.error('Error in loadFeedbacks:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setFeedbacks([]);
      setCounts({ total: 0, new: 0, reviewed: 0, resolved: 0 });
      setLoading(false);
      setRealtimeStatus('disconnected');
      return;
    }

    // Initial load
    loadFeedbacks();

    // Set up real-time subscription
    setRealtimeStatus('connecting');
    
    // Get project IDs for real-time subscription
    const { data: settingsData } = await supabase
      .from('feedback_settings')
      .select('id')
      .eq('user_id', user.id);

    if (settingsData && settingsData.length > 0) {
      const projectIds = settingsData.map(s => s.id);
      
      const channel = supabase
        .channel('feedback-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feedback',
            filter: `project_id=in.(${projectIds.join(',')})`
          },
          (payload) => {
            console.log('Feedback real-time update:', payload);
            
            if (payload.eventType === 'INSERT') {
              setFeedbacks(prev => [payload.new as Feedback, ...prev]);
              setCounts(prev => ({
                ...prev,
                total: prev.total + 1,
                new: prev.new + (!payload.new.sentiment ? 1 : 0),
                reviewed: prev.reviewed + (payload.new.sentiment ? 1 : 0)
              }));
            } else if (payload.eventType === 'UPDATE') {
              setFeedbacks(prev => prev.map(item => 
                item.id === payload.new.id ? payload.new as Feedback : item
              ));
              // Recalculate counts for sentiment changes
              loadFeedbacks();
            } else if (payload.eventType === 'DELETE') {
              setFeedbacks(prev => prev.filter(item => item.id !== payload.old.id));
              setCounts(prev => ({
                ...prev,
                total: Math.max(0, prev.total - 1)
              }));
            }
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('connected');
          } else if (status === 'CHANNEL_ERROR') {
            setRealtimeStatus('disconnected');
          }
        });

      return () => {
        supabase.removeChannel(channel);
        setRealtimeStatus('disconnected');
      };
    } else {
      setRealtimeStatus('disconnected');
    }
  }, [user]);

  return {
    feedbacks,
    counts,
    loading,
    error,
    realtimeStatus,
    loadFeedbacks
  };
};