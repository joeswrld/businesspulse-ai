import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Feedback {
  id: string;
  project_id: string;
  user_id: string | null;
  form_type: 'customer_satisfaction' | 'product_feedback';
  message: string;
  rating: number | null;
  metadata: any;
  created_at: string;
}

interface FeedbackStats {
  totalFeedback: number;
  averageRating: number;
  customerSatisfactionCount: number;
  productFeedbackCount: number;
  ratingDistribution: { [key: number]: number };
  recentFeedback: Feedback[];
}

interface UseFeedbackOptions {
  projectId?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  formType?: 'customer_satisfaction' | 'product_feedback' | 'all';
  realtime?: boolean;
}

export function useFeedback(options: UseFeedbackOptions = {}) {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeedbackData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get user's project IDs
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id);

      if (projectsError) {
        console.error('Error loading projects:', projectsError);
        throw projectsError;
      }

      const projectIds = projectsData?.map(p => p.id) || [];

      if (projectIds.length === 0) {
        setFeedbacks([]);
        setStats(null);
        return;
      }

      // Filter by specific project if provided
      const targetProjectIds = options.projectId 
        ? projectIds.filter(id => id === options.projectId)
        : projectIds;

      if (targetProjectIds.length === 0) {
        setFeedbacks([]);
        setStats(null);
        return;
      }

      // Build query
      let query = supabase
        .from('feedback')
        .select('*')
        .in('project_id', targetProjectIds)
        .order('created_at', { ascending: false });

      // Apply form type filter
      if (options.formType && options.formType !== 'all') {
        query = query.eq('form_type', options.formType);
      }

      // Apply date range filter
      if (options.dateRange?.start) {
        query = query.gte('created_at', options.dateRange.start.toISOString());
      }
      if (options.dateRange?.end) {
        query = query.lte('created_at', options.dateRange.end.toISOString());
      }

      const { data: feedbacksData, error: feedbacksError } = await query;

      if (feedbacksError) {
        console.error('Error loading feedbacks:', feedbacksError);
        throw feedbacksError;
      }

      setFeedbacks(feedbacksData || []);

      // Calculate stats
      const feedbacksList = feedbacksData || [];
      const totalFeedback = feedbacksList.length;
      const ratings = feedbacksList.filter(f => f.rating).map(f => f.rating!);
      const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
      const customerSatisfactionCount = feedbacksList.filter(f => f.form_type === 'customer_satisfaction').length;
      const productFeedbackCount = feedbacksList.filter(f => f.form_type === 'product_feedback').length;
      
      const ratingDistribution: { [key: number]: number } = {};
      for (let i = 1; i <= 5; i++) {
        ratingDistribution[i] = ratings.filter(r => r === i).length;
      }

      setStats({
        totalFeedback,
        averageRating,
        customerSatisfactionCount,
        productFeedbackCount,
        ratingDistribution,
        recentFeedback: feedbacksList.slice(0, 5)
      });

    } catch (error) {
      console.error('Error loading feedback data:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while loading data');
    } finally {
      setLoading(false);
    }
  }, [user, options.projectId, options.formType, options.dateRange]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    if (user) {
      loadFeedbackData();
    }
  }, [loadFeedbackData, user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || !options.realtime) return;

    const channel = supabase
      .channel('feedback-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback'
        },
        (payload) => {
          console.log('Feedback change received:', payload);
          loadFeedbackData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadFeedbackData, options.realtime]);

  // Submit feedback
  const submitFeedback = useCallback(async (feedbackData: {
    project_id: string;
    form_type: 'customer_satisfaction' | 'product_feedback';
    message: string;
    rating?: number;
    metadata?: any;
  }) => {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .insert({
          ...feedbackData,
          user_id: user?.id || null,
          metadata: {
            ...feedbackData.metadata,
            submitted_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting feedback:', error);
        throw error;
      }

      // Refresh data
      await loadFeedbackData();

      return data;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }, [user, loadFeedbackData]);

  // Delete feedback
  const deleteFeedback = useCallback(async (feedbackId: string) => {
    try {
      const { error } = await supabase
        .from('feedback')
        .delete()
        .eq('id', feedbackId);

      if (error) {
        console.error('Error deleting feedback:', error);
        throw error;
      }

      // Refresh data
      await loadFeedbackData();
    } catch (error) {
      console.error('Error deleting feedback:', error);
      throw error;
    }
  }, [loadFeedbackData]);

  return {
    feedbacks,
    stats,
    loading,
    error,
    submitFeedback,
    deleteFeedback,
    refresh: loadFeedbackData
  };
}