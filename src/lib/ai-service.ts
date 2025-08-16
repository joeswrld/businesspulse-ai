import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type AIInsightRow = Database['public']['Tables']['ai_insights']['Row'];

export interface AIInsight {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  content: {
    key_findings: string[];
    recommendations: string[];
    projected_impact: string;
    tags: string[];
  };
  insight_type: string;
  industry_category: string | null;
  priority: string | null;
  confidence_score: number | null;
  is_actionable: boolean | null;
  data_source_id: string | null;
  created_at: string;
  updated_at: string;
}

export class AIService {
  // Transform database row to our interface
  private static transformInsight(row: AIInsightRow): AIInsight {
    let content;
    try {
      content = typeof row.content === 'string' 
        ? JSON.parse(row.content) 
        : row.content as any;
    } catch {
      content = {
        key_findings: [],
        recommendations: [],
        projected_impact: '',
        tags: []
      };
    }

    return {
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      summary: row.summary,
      content,
      insight_type: row.insight_type,
      industry_category: row.industry_category,
      priority: row.priority,
      confidence_score: row.confidence_score,
      is_actionable: row.is_actionable,
      data_source_id: row.data_source_id,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  // Generate new insights using Gemini AI
  static async generateInsights(): Promise<{ success: boolean; insights?: AIInsight[]; count?: number; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: {}
      });

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error generating insights:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate insights' 
      };
    }
  }

  // Fetch user's insights with real-time support
  static async fetchInsights(): Promise<AIInsight[]> {
    try {
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.transformInsight);
    } catch (error) {
      console.error('Error fetching insights:', error);
      return [];
    }
  }

  // Search and filter insights
  static async searchInsights(filters: {
    search?: string;
    category?: string;
    priority?: string;
  }): Promise<AIInsight[]> {
    try {
      let query = supabase
        .from('ai_insights')
        .select('*');

      if (filters.category && filters.category !== 'all') {
        query = query.eq('industry_category', filters.category);
      }

      if (filters.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,summary.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.transformInsight);
    } catch (error) {
      console.error('Error searching insights:', error);
      return [];
    }
  }

  // Toggle bookmark status
  static async toggleBookmark(insightId: string, isBookmarked: boolean): Promise<boolean> {
    try {
      // First get the current content
      const { data: currentInsight, error: fetchError } = await supabase
        .from('ai_insights')
        .select('content')
        .eq('id', insightId)
        .single();

      if (fetchError) throw fetchError;

      let updatedContent;
      try {
        updatedContent = typeof currentInsight.content === 'string' 
          ? JSON.parse(currentInsight.content) 
          : currentInsight.content as any;
      } catch {
        updatedContent = {};
      }

      updatedContent.bookmarked = isBookmarked;

      const { error } = await supabase
        .from('ai_insights')
        .update({ 
          content: updatedContent
        })
        .eq('id', insightId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      return false;
    }
  }

  // Create action plan from insight
  static async createActionPlan(insightId: string, insight: AIInsight): Promise<boolean> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // For now, we'll use the goals table as action plans
      const { error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          name: `Action Plan: ${insight.title}`,
          description: insight.content.projected_impact,
          category: insight.industry_category || 'Business',
          target_value: 100,
          current_value: 0,
          unit: 'percent',
          target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating action plan:', error);
      return false;
    }
  }

  // Export insights to CSV
  static exportToCSV(insights: AIInsight[]): string {
    const headers = ['Title', 'Category', 'Priority', 'Confidence', 'Key Findings', 'Recommendations', 'Impact', 'Created At'];
    
    const rows = insights.map(insight => [
      insight.title,
      insight.industry_category || '',
      insight.priority || '',
      `${insight.confidence_score || 0}%`,
      insight.content.key_findings?.join('; ') || '',
      insight.content.recommendations?.join('; ') || '',
      insight.content.projected_impact || '',
      new Date(insight.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  // Get insights statistics
  static getInsightsStats(insights: AIInsight[]) {
    const totalInsights = insights.length;
    const highPriorityCount = insights.filter(i => i.priority === 'high').length;
    const avgConfidence = insights.length > 0 
      ? Math.round(insights.reduce((acc, i) => acc + (i.confidence_score || 0), 0) / insights.length)
      : 0;
    const bookmarkedCount = insights.filter(i => 
      typeof i.content === 'object' && 'bookmarked' in i.content && i.content.bookmarked
    ).length;

    return {
      totalInsights,
      highPriorityCount,
      avgConfidence,
      bookmarkedCount
    };
  }
}