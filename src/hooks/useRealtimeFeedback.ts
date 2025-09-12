import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Feedback {
  id: string;
  project_id: string;
  name: string;
  email: string;
  message: string;
  timestamp: string;
  status: 'new' | 'reviewed' | 'resolved';
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

      // Fetch feedbacks from the feedback table
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });

      if (feedbackError) {
        console.error('Error fetching feedbacks:', feedbackError);
        setError(feedbackError.message);
        return;
      }

      const feedbacks = feedbackData || [];
      setFeedbacks(feedbacks);

      // Calculate counts
      const newCount = feedbacks.filter(f => f.status === 'new').length;
      const reviewedCount = feedbacks.filter(f => f.status === 'reviewed').length;
      const resolvedCount = feedbacks.filter(f => f.status === 'resolved').length;

      setCounts({
        total: feedbacks.length,
        new: newCount,
        reviewed: reviewedCount,
        resolved: resolvedCount
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
    
    const channel = supabase
      .channel('feedback-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Feedback real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setFeedbacks(prev => [payload.new as Feedback, ...prev]);
            setCounts(prev => ({
              ...prev,
              total: prev.total + 1,
              new: prev.new + (payload.new.status === 'new' ? 1 : 0),
              reviewed: prev.reviewed + (payload.new.status === 'reviewed' ? 1 : 0),
              resolved: prev.resolved + (payload.new.status === 'resolved' ? 1 : 0)
            }));
          } else if (payload.eventType === 'UPDATE') {
            setFeedbacks(prev => prev.map(item => 
              item.id === payload.new.id ? payload.new as Feedback : item
            ));
            // Recalculate counts for status changes
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