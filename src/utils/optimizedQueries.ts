import { supabase } from "@/integrations/supabase/client";
import { dbPerformance } from "./performance";

// Optimized query functions for better performance

export const optimizedQueries = {
  // Get user's latest feedback settings using the optimized view
  async getUserSettings(userId: string) {
    return dbPerformance.query('Get User Settings (Optimized)', async () => {
      // First try the active settings view for faster lookup
      const { data: activeData, error: activeError } = await supabase
        .from('active_feedback_settings')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

      if (activeError) {
        console.warn('Active settings view failed, falling back to regular query:', activeError);
      } else if (activeData && activeData.length > 0) {
        return { data: activeData, error: null };
      }

      // Fallback to regular query if view doesn't work or no active settings
      return supabase
        .from('feedback_settings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
    });
  },

  // Get user's project ID only (minimal data)
  async getUserProjectId(userId: string) {
    return dbPerformance.query('Get Project ID (Optimized)', async () => {
      // Use manual filtering since is_active column might not exist
      return supabase
        .from('feedback_settings')
        .select('project_id, project_id_locked')
        .eq('user_id', userId)
        .not('project_id', 'is', null)
        .neq('project_id', '')
        .eq('project_id_locked', true)
        .order('created_at', { ascending: false })
        .limit(1);
    });
  },

  // Get feedbacks with optimized query
  async getFeedbacks(projectId: string, limit?: number) {
    return dbPerformance.query('Get Feedbacks (Optimized)', () =>
      supabase
        .from('feedbacks')
        .select('*')
        .eq('project_id', projectId)
        .order('timestamp', { ascending: false })
        .limit(limit || 100) // Add reasonable limit
    );
  },

  // Get feedback summary for dashboard
  async getFeedbackSummary(userId: string) {
    return dbPerformance.query('Get Feedback Summary', () =>
      supabase
        .from('user_feedback_summary')
        .select('*')
        .eq('user_id', userId)
        .single()
    );
  },

  // Create new settings with optimized insert
  async createSettings(settingsData: any) {
    return dbPerformance.query('Create Settings (Optimized)', () =>
      supabase
        .from('feedback_settings')
        .insert(settingsData)
        .select()
        .single()
    );
  },

  // Update settings with optimized update
  async updateSettings(id: string, updates: any) {
    return dbPerformance.query('Update Settings (Optimized)', () =>
      supabase
        .from('feedback_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    );
  }
};

// Cache management for better performance
export const queryCache = {
  cache: new Map<string, { data: any; timestamp: number; ttl: number }>(),

  set(key: string, data: any, ttl: number = 30000) { // 30 seconds default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  },

  get(key: string) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  },

  clear() {
    this.cache.clear();
  },

  // Cache key generators
  keys: {
    userSettings: (userId: string) => `settings:${userId}`,
    projectId: (userId: string) => `project:${userId}`,
    feedbacks: (projectId: string) => `feedbacks:${projectId}`,
    summary: (userId: string) => `summary:${userId}`
  }
};