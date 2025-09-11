import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface Feedback {
  id: string;
  project_id: string;
  channel: 'widget' | 'qr' | 'email_signature';
  name: string | null;
  email: string | null;
  message: string;
  created_at: string;
}

interface UseRealtimeFeedbackOptions {
  projectId?: string;
  enabled?: boolean;
  onNewFeedback?: (feedback: Feedback) => void;
  onUpdateFeedback?: (feedback: Feedback) => void;
  onDeleteFeedback?: (feedbackId: string) => void;
}

export const useRealtimeFeedback = ({
  projectId,
  enabled = true,
  onNewFeedback,
  onUpdateFeedback,
  onDeleteFeedback
}: UseRealtimeFeedbackOptions = {}) => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Load initial feedback data
  const loadFeedback = useCallback(async () => {
    if (!projectId || !enabled) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('feedback')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setFeedback(data || []);
    } catch (err) {
      console.error('Error loading feedback:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [projectId, enabled]);

  // Set up real-time subscription
  useEffect(() => {
    if (!enabled) return;

    let subscription: any = null;

    const setupSubscription = async () => {
      try {
        // Load initial data
        await loadFeedback();

        // Set up real-time subscription
        subscription = supabase
          .channel('feedback-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'feedback',
              filter: projectId ? `project_id=eq.${projectId}` : undefined
            },
            (payload: RealtimePostgresChangesPayload<any>) => {
              console.log('Real-time feedback update:', payload);

              switch (payload.eventType) {
                case 'INSERT':
                  const newFeedback = payload.new as Feedback;
                  setFeedback(prev => [newFeedback, ...prev]);
                  onNewFeedback?.(newFeedback);
                  break;

                case 'UPDATE':
                  const updatedFeedback = payload.new as Feedback;
                  setFeedback(prev =>
                    prev.map(f => f.id === updatedFeedback.id ? updatedFeedback : f)
                  );
                  onUpdateFeedback?.(updatedFeedback);
                  break;

                case 'DELETE':
                  const deletedId = payload.old.id;
                  setFeedback(prev => prev.filter(f => f.id !== deletedId));
                  onDeleteFeedback?.(deletedId);
                  break;
              }
            }
          )
          .subscribe((status) => {
            console.log('Real-time subscription status:', status);
            setIsConnected(status === 'SUBSCRIBED');
          });

      } catch (err) {
        console.error('Error setting up real-time subscription:', err);
        setError(err instanceof Error ? err.message : 'Failed to set up real-time updates');
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [projectId, enabled, loadFeedback, onNewFeedback, onUpdateFeedback, onDeleteFeedback]);

  // Manual refresh function
  const refresh = useCallback(() => {
    loadFeedback();
  }, [loadFeedback]);

  // Get feedback by channel
  const getFeedbackByChannel = useCallback((channel: 'widget' | 'qr' | 'email_signature') => {
    return feedback.filter(f => f.channel === channel);
  }, [feedback]);

  // Get recent feedback (last 24 hours)
  const getRecentFeedback = useCallback((hours = 24) => {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    return feedback.filter(f => new Date(f.created_at) > cutoff);
  }, [feedback]);

  // Get feedback statistics
  const getStats = useCallback(() => {
    const total = feedback.length;
    const byChannel = {
      widget: feedback.filter(f => f.channel === 'widget').length,
      qr: feedback.filter(f => f.channel === 'qr').length,
      email_signature: feedback.filter(f => f.channel === 'email_signature').length
    };
    const withEmail = feedback.filter(f => f.email).length;
    const withName = feedback.filter(f => f.name).length;

    return {
      total,
      byChannel,
      withEmail,
      withName,
      completionRate: total > 0 ? ((withEmail + withName) / (total * 2)) * 100 : 0
    };
  }, [feedback]);

  return {
    feedback,
    loading,
    error,
    isConnected,
    refresh,
    getFeedbackByChannel,
    getRecentFeedback,
    getStats
  };
};

export default useRealtimeFeedback;