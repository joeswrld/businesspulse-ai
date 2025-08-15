// AI service for handling insights, vector search, and real-time updates

import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export interface AIInsight {
  id: string;
  title: string;
  summary: string | null;
  insight_type: string;
  priority: string | null;
  confidence_score: number | null;
  content: {
    key_findings: string[];
    recommendations: string[];
    projected_impact: string;
    tags: string[];
  };
  created_at: string;
  user_id: string;
  data_source_id: string | null;
}

export interface SearchQuery {
  query: string;
  filters?: {
    priority?: string[];
    insight_type?: string[];
    date_range?: {
      start: string;
      end: string;
    };
    tags?: string[];
  };
  limit?: number;
}

export class AIService {
  // Generate insights from uploaded data
  async generateInsights(dataSourceId: string, userId: string): Promise<AIInsight[]> {
    try {
      // Get the data source and normalized content
      const { data: dataSource, error: dataSourceError } = await supabase
        .from('data_sources')
        .select('*')
        .eq('id', dataSourceId)
        .eq('user_id', userId)
        .single();

      if (dataSourceError) throw dataSourceError;

      // Get normalized document content
      const { data: normalizedDoc, error: docError } = await supabase
        .from('normalized_docs')
        .select('*')
        .eq('data_source_id', dataSourceId)
        .eq('user_id', userId)
        .single();

      if (docError) throw docError;

      // Call the Edge Function to generate insights
      const response = await fetch('/api/process-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          data_source_id: dataSourceId,
          user_id: userId,
          file_url: dataSource.file_url,
          file_type: dataSource.type,
          text_content: normalizedDoc.content?.normalized
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      const result = await response.json();
      return result.data?.insights || [];

    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    }
  }

  // Search insights using vector similarity
  async searchInsights(query: SearchQuery, userId: string): Promise<AIInsight[]> {
    try {
      let queryBuilder = supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', userId);

      // Apply filters
      if (query.filters?.priority?.length) {
        queryBuilder = queryBuilder.in('priority', query.filters.priority);
      }

      if (query.filters?.insight_type?.length) {
        queryBuilder = queryBuilder.in('insight_type', query.filters.insight_type);
      }

      if (query.filters?.date_range) {
        queryBuilder = queryBuilder
          .gte('created_at', query.filters.date_range.start)
          .lte('created_at', query.filters.date_range.end);
      }

      if (query.filters?.tags?.length) {
        // Search in content.tags array
        queryBuilder = queryBuilder.contains('content', { tags: query.filters.tags });
      }

      // Apply limit
      if (query.limit) {
        queryBuilder = queryBuilder.limit(query.limit);
      }

      // Order by confidence score and creation date
      queryBuilder = queryBuilder
        .order('confidence_score', { ascending: false })
        .order('created_at', { ascending: false });

      const { data: insights, error } = await queryBuilder;

      if (error) throw error;

      return insights || [];

    } catch (error) {
      console.error('Error searching insights:', error);
      throw error;
    }
  }

  // Get insights with real-time updates
  async getInsightsRealtime(userId: string, callback: (insights: AIInsight[]) => void) {
    // Initial fetch
    const { data: insights, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && insights) {
      callback(insights);
    }

    // Set up real-time subscription
    const channel = supabase
      .channel('insights-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_insights',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          // Refetch all insights to get updated data
          const { data: updatedInsights, error: refetchError } = await supabase
            .from('ai_insights')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (!refetchError && updatedInsights) {
            callback(updatedInsights);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Get insights by data source
  async getInsightsByDataSource(dataSourceId: string, userId: string): Promise<AIInsight[]> {
    try {
      const { data: insights, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('data_source_id', dataSourceId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return insights || [];

    } catch (error) {
      console.error('Error fetching insights by data source:', error);
      throw error;
    }
  }

  // Create action plan from insight
  async createActionPlan(insightId: string, userId: string, actionPlan: {
    title: string;
    description: string;
    priority: string;
    due_date?: string;
    assigned_to?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('action_plans')
        .insert({
          insight_id: insightId,
          user_id: userId,
          ...actionPlan
        })
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Error creating action plan:', error);
      throw error;
    }
  }

  // Get action plans for user
  async getActionPlans(userId: string) {
    try {
      const { data, error } = await supabase
        .from('action_plans')
        .select(`
          *,
          ai_insights (
            title,
            summary,
            insight_type
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Error fetching action plans:', error);
      throw error;
    }
  }

  // Provide feedback on insight
  async provideFeedback(insightId: string, userId: string, feedbackType: 'thumbs_up' | 'thumbs_down' | 'bookmark') {
    try {
      // Check if feedback already exists
      const { data: existingFeedback } = await supabase
        .from('ai_insights_feedback')
        .select('*')
        .eq('insight_id', insightId)
        .eq('user_id', userId)
        .eq('feedback_type', feedbackType)
        .single();

      if (existingFeedback) {
        // Remove existing feedback (toggle off)
        const { error } = await supabase
          .from('ai_insights_feedback')
          .delete()
          .eq('id', existingFeedback.id);

        if (error) throw error;
        return { action: 'removed', feedback: null };
      } else {
        // Add new feedback
        const { data, error } = await supabase
          .from('ai_insights_feedback')
          .insert({
            insight_id: insightId,
            user_id: userId,
            feedback_type: feedbackType
          })
          .select()
          .single();

        if (error) throw error;
        return { action: 'added', feedback: data };
      }

    } catch (error) {
      console.error('Error providing feedback:', error);
      throw error;
    }
  }

  // Get analytics data
  async getAnalytics(userId: string, dateRange: { start: string; end: string }) {
    try {
      const { data, error } = await supabase
        .from('analytics_daily')
        .select('*')
        .eq('user_id', userId)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: true });

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  }

  // Update analytics for a specific date
  async updateAnalytics(userId: string, date: string, analytics: Partial<Tables<'analytics_daily'>>) {
    try {
      const { data, error } = await supabase
        .from('analytics_daily')
        .upsert({
          user_id: userId,
          date,
          ...analytics
        })
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Error updating analytics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const aiService = new AIService();