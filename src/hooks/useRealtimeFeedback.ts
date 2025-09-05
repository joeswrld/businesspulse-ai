import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FeedbackCounts {
  total: number;
  new: number;
  reviewed: number;
  resolved: number;
}

export interface FeedbackNotification {
  id: string;
  project_id: string;
  name: string | null;
  email: string | null;
  message: string;
  timestamp: string;
  status: 'new' | 'reviewed' | 'resolved';
  tags?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export const useRealtimeFeedback = () => {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<FeedbackNotification[]>([]);
  const [counts, setCounts] = useState<FeedbackCounts>({
    total: 0,
    new: 0,
    reviewed: 0,
    resolved: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;

  // Calculate counts from feedbacks
  const calculateCounts = useCallback((feedbackList: FeedbackNotification[]): FeedbackCounts => {
    return {
      total: feedbackList.length,
      new: feedbackList.filter(f => f.status === 'new').length,
      reviewed: feedbackList.filter(f => f.status === 'reviewed').length,
      resolved: feedbackList.filter(f => f.status === 'resolved').length
    };
  }, []);

  // Analyze sentiment from message content
  const analyzeSentiment = useCallback((message: string): 'positive' | 'negative' | 'neutral' => {
    const positiveWords = [
      'great', 'good', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'satisfied',
      'perfect', 'awesome', 'outstanding', 'brilliant', 'superb', 'terrific', 'pleased', 'impressed', 'smooth',
      'fast', 'easy', 'intuitive', 'beautiful', 'clean', 'modern', 'helpful', 'supportive', 'responsive'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'frustrated', 'annoyed', 'disappointed',
      'broken', 'slow', 'difficult', 'confusing', 'ugly', 'cluttered', 'buggy', 'crash', 'error', 'fail',
      'useless', 'waste', 'problem', 'issue', 'complaint', 'unhappy', 'dissatisfied', 'poor', 'weak'
    ];

    const messageLower = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => messageLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => messageLower.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }, []);

  // Load user's feedbacks
  const loadFeedbacks = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get user's feedback settings to find their project IDs
      const { data: feedbackSettings, error: settingsError } = await (supabase as any)
        .from('feedback_settings')
        .select('project_id')
        .eq('user_id', user.id);

      if (settingsError) {
        console.error('Error loading feedback settings:', settingsError);
        setError('Failed to load feedback settings');
        return;
      }

      if (!feedbackSettings || feedbackSettings.length === 0) {
        setFeedbacks([]);
        setCounts({ total: 0, new: 0, reviewed: 0, resolved: 0 });
        return;
      }

      const projectIds = feedbackSettings.map(setting => setting.project_id).filter(Boolean);

      if (projectIds.length === 0) {
        setFeedbacks([]);
        setCounts({ total: 0, new: 0, reviewed: 0, resolved: 0 });
        return;
      }

      // Get feedbacks for user's projects
      const { data: feedbacksData, error: feedbacksError } = await (supabase as any)
        .from('feedbacks')
        .select('*')
        .in('project_id', projectIds)
        .order('timestamp', { ascending: false });

      if (feedbacksError) {
        console.error('Error loading feedbacks:', feedbacksError);
        setError('Failed to load feedbacks');
        return;
      }

      // Load tags for each feedback
      const feedbacksWithTags = await Promise.all(
        (feedbacksData || []).map(async (feedback: any) => {
          const { data: tagsData } = await (supabase as any)
            .from('feedback_tags')
            .select('tag')
            .eq('feedback_id', feedback.id);
          
          return {
            ...feedback,
            tags: (tagsData as any)?.map((t: any) => t.tag) || [],
            sentiment: analyzeSentiment(feedback.message)
          };
        })
      );

      setFeedbacks(feedbacksWithTags as any);
      setCounts(calculateCounts(feedbacksWithTags as any));
    } catch (error) {
      console.error('Error in loadFeedbacks:', error);
      setError('Failed to load feedbacks');
    } finally {
      setLoading(false);
    }
  }, [user, analyzeSentiment, calculateCounts]);

  // Setup real-time subscription with reconnection
  useEffect(() => {
    if (!user) return;

    let channel: any = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const setupRealtime = async () => {
      try {
        setRealtimeStatus('connecting');
        
        const { data: feedbackSettings } = await (supabase as any)
          .from('feedback_settings')
          .select('project_id')
          .eq('user_id', user.id);

        if (!feedbackSettings || feedbackSettings.length === 0) {
          setRealtimeStatus('disconnected');
          return;
        }

        const projectIds = feedbackSettings.map(setting => setting.project_id).filter(Boolean);
        
        if (projectIds.length === 0) {
          setRealtimeStatus('disconnected');
          return;
        }

        // Create a single channel for all projects
        channel = supabase
          .channel(`feedbacks-${user.id}`, {
            config: {
              presence: { key: user.id },
              broadcast: { self: true }
            }
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'feedbacks',
            filter: `project_id=in.(${projectIds.join(',')})`
          }, async (payload) => {
            console.log('Real-time feedback event received:', payload);
            
            if (payload.eventType === 'INSERT') {
              const newFeedback = payload.new as FeedbackNotification;
              const feedbackWithTags = {
                ...newFeedback,
                tags: [],
                sentiment: analyzeSentiment(newFeedback.message)
              };
              
              setFeedbacks(prev => {
                const updated = [feedbackWithTags, ...prev];
                setCounts(calculateCounts(updated));
                return updated;
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedFeedback = payload.new as FeedbackNotification;
              
              setFeedbacks(prev => {
                const updated = prev.map(f => 
                  f.id === updatedFeedback.id ? { ...f, ...updatedFeedback } : f
                );
                setCounts(calculateCounts(updated));
                return updated;
              });
            } else if (payload.eventType === 'DELETE') {
              const deletedFeedback = payload.old as FeedbackNotification;
              
              setFeedbacks(prev => {
                const updated = prev.filter(f => f.id !== deletedFeedback.id);
                setCounts(calculateCounts(updated));
                return updated;
              });
            }
          })
          .subscribe((status) => {
            console.log('Real-time subscription status:', status);
            if (status === 'SUBSCRIBED') {
              setRealtimeStatus('connected');
              setReconnectAttempts(0);
            } else if (status === 'CHANNEL_ERROR') {
              setRealtimeStatus('error');
              handleReconnection();
            } else if (status === 'TIMED_OUT') {
              setRealtimeStatus('disconnected');
              handleReconnection();
            } else {
              setRealtimeStatus('disconnected');
            }
          });

      } catch (error) {
        console.error('Error setting up real-time subscription:', error);
        setRealtimeStatus('error');
        handleReconnection();
      }
    };

    const handleReconnection = () => {
      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff, max 30s
        console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeout = setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          setupRealtime();
        }, delay);
      } else {
        console.error('Max reconnection attempts reached');
        setRealtimeStatus('error');
      }
    };

    setupRealtime();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, analyzeSentiment, calculateCounts, reconnectAttempts]);

  // Load data on mount
  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  // Update feedback status
  const updateFeedbackStatus = useCallback(async (feedbackId: string, newStatus: 'new' | 'reviewed' | 'resolved') => {
    try {
      const { error } = await (supabase as any)
        .from('feedbacks')
        .update({ status: newStatus })
        .eq('id', feedbackId);

      if (error) {
        throw error;
      }

      // The real-time subscription will handle the state update
      return true;
    } catch (error) {
      console.error('Error updating feedback status:', error);
      throw error;
    }
  }, []);

  // Add tag to feedback
  const addTagToFeedback = useCallback(async (feedbackId: string, tag: string) => {
    if (!tag.trim()) return false;

    try {
      const { error } = await (supabase as any)
        .from('feedback_tags')
        .insert({
          feedback_id: feedbackId,
          tag: tag.trim().toLowerCase()
        });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error adding tag:', error);
      throw error;
    }
  }, []);

  // Remove tag from feedback
  const removeTagFromFeedback = useCallback(async (feedbackId: string, tagToRemove: string) => {
    try {
      const { error } = await (supabase as any)
        .from('feedback_tags')
        .delete()
        .eq('feedback_id', feedbackId)
        .eq('tag', tagToRemove);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error removing tag:', error);
      throw error;
    }
  }, []);

  // Manual refresh function
  const refreshFeedbacks = useCallback(async () => {
    await loadFeedbacks();
  }, [loadFeedbacks]);

  // Force reconnection
  const forceReconnect = useCallback(() => {
    setReconnectAttempts(0);
    setRealtimeStatus('connecting');
  }, []);

  return {
    feedbacks,
    counts,
    loading,
    error,
    realtimeStatus,
    reconnectAttempts,
    maxReconnectAttempts,
    loadFeedbacks: refreshFeedbacks,
    updateFeedbackStatus,
    addTagToFeedback,
    removeTagFromFeedback,
    forceReconnect
  };
};