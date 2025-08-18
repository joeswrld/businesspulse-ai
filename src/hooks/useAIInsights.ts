import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AIInsight {
  id: string;
  user_id: string;
  data_source_id?: string;
  title: string;
  industry_category: string;
  priority: string;
  confidence_score: number;
  summary?: string;
  insight_type: string;
  content: any;
  is_actionable: boolean;
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
      const category = insight.industry_category || 'Unknown';
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
      avgConfidence: insights.reduce((acc, i) => acc + (i.confidence_score || 0), 0) / insights.length,
      bookmarkedCount: 0, // No bookmarking functionality since tags don't exist
      categoryBreakdown,
      priorityBreakdown
    };
  }, [insights]);

  // Filter insights
  const filterInsights = useCallback((
    searchTerm: string = '',
    category: string = 'all',
    priority: string = 'all'
  ) => {
    return insights.filter(insight => {
      const matchesSearch = !searchTerm || 
        insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        insight.summary?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = category === 'all' || insight.industry_category === category;
      const matchesPriority = priority === 'all' || insight.priority?.toLowerCase() === priority;

      return matchesSearch && matchesCategory && matchesPriority;
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
    filterInsights,
    refetch: fetchInsights
  };
};