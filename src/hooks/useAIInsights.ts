import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AIInsight {
  id: string;
  user_id: string;
  data_source_id?: string;
  title: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low' | 'high' | 'medium' | 'low';
  confidence: number;
  summary?: string;
  key_findings?: string[];
  recommendations?: string[];
  projected_impact?: string;
  tags?: string[];
  source?: string;
  insight_type?: string;
  content?: any;
  findings?: string[];
  created_at: string;
  updated_at: string;
}

export interface InsightStats {
  totalInsights: number;
  highPriorityCount: number;
  avgConfidence: number;
  bookmarkedCount: number;
  categoryBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
}

export const useAIInsights = () => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch insights from database
  const fetchInsights = useCallback(async () => {
    if (!user) {
      setInsights([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setInsights(data || []);
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Calculate statistics
  const calculateStats = useCallback((): InsightStats => {
    if (!insights.length) {
      return {
        totalInsights: 0,
        highPriorityCount: 0,
        avgConfidence: 0,
        bookmarkedCount: 0,
        categoryBreakdown: {},
        priorityBreakdown: {}
      };
    }

    const categoryBreakdown = insights.reduce((acc, insight) => {
      const category = insight.category || 'Unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const priorityBreakdown = insights.reduce((acc, insight) => {
      const priority = insight.priority?.toLowerCase() || 'unknown';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalInsights: insights.length,
      highPriorityCount: insights.filter(i => 
        i.priority?.toLowerCase() === 'high'
      ).length,
      avgConfidence: insights.reduce((acc, i) => acc + (i.confidence || 0), 0) / insights.length,
      bookmarkedCount: insights.filter(i => 
        i.tags?.includes('bookmarked')
      ).length,
      categoryBreakdown,
      priorityBreakdown
    };
  }, [insights]);

  // Bookmark an insight
  const bookmarkInsight = useCallback(async (insightId: string, bookmarked: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('ai_insights')
        .update({
          tags: bookmarked 
            ? supabase.sql`array_append(tags, 'bookmarked')`
            : supabase.sql`array_remove(tags, 'bookmarked')`
        })
        .eq('id', insightId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setInsights(prev => prev.map(insight => 
        insight.id === insightId 
          ? {
              ...insight,
              tags: bookmarked 
                ? [...(insight.tags || []), 'bookmarked']
                : (insight.tags || []).filter(tag => tag !== 'bookmarked')
            }
          : insight
      ));

    } catch (err) {
      console.error('Error bookmarking insight:', err);
      throw err;
    }
  }, [user]);

  // Add feedback to an insight
  const addFeedback = useCallback(async (insightId: string, feedbackType: 'thumbs_up' | 'thumbs_down' | 'bookmark') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('ai_insights_feedback')
        .insert({
          insight_id: insightId,
          user_id: user.id,
          feedback_type: feedbackType
        });

      if (error) throw error;

    } catch (err) {
      console.error('Error adding feedback:', err);
      throw err;
    }
  }, [user]);

  // Create action plan from insight
  const createActionPlan = useCallback(async (insightId: string, actionPlan: {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    due_date?: string;
  }) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('action_plans')
        .insert({
          insight_id: insightId,
          user_id: user.id,
          title: actionPlan.title,
          description: actionPlan.description,
          priority: actionPlan.priority || 'medium',
          due_date: actionPlan.due_date
        });

      if (error) throw error;

    } catch (err) {
      console.error('Error creating action plan:', err);
      throw err;
    }
  }, [user]);

  // Filter insights
  const filterInsights = useCallback((
    searchTerm: string = '',
    category: string = 'all',
    priority: string = 'all',
    tags: string[] = []
  ) => {
    return insights.filter(insight => {
      const matchesSearch = !searchTerm || 
        insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        insight.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        insight.projected_impact?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = category === 'all' || insight.category === category;
      const matchesPriority = priority === 'all' || insight.priority?.toLowerCase() === priority;
      const matchesTags = tags.length === 0 || 
        tags.some(tag => insight.tags?.includes(tag));

      return matchesSearch && matchesCategory && matchesPriority && matchesTags;
    });
  }, [insights]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) {
      setInsights([]);
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchInsights();

    // Set up real-time subscription
    const channel = supabase
      .channel('ai-insights-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_insights',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('AI Insights real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setInsights(prev => [payload.new as AIInsight, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setInsights(prev => prev.map(item => 
              item.id === payload.new.id ? payload.new as AIInsight : item
            ));
          } else if (payload.eventType === 'DELETE') {
            setInsights(prev => prev.filter(item => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchInsights]);

  return {
    insights,
    loading,
    error,
    stats: calculateStats(),
    bookmarkInsight,
    addFeedback,
    createActionPlan,
    filterInsights,
    refetch: fetchInsights
  };
};