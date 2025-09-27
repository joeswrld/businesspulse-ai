import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FeedbackSettings {
  id: string;
  user_id: string;
  project_id: string;
  widget_title: string | null;
  widget_color: string | null;
  greeting_text: string | null;
  created_at: string;
  default_branding?: any;
}

export const useFeedbackSettings = (projectId?: string) => {
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    loadSettings();
  }, [user?.id, projectId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, try to get settings for the specific project
      if (projectId) {
        const { data: projectSettings, error: projectError } = await supabase
          .from('feedback_settings')
          .select('*')
          .eq('project_id', projectId)
          .eq('user_id', user?.id)
          .single();

        if (projectSettings && !projectError) {
          setSettings(projectSettings);
          setLoading(false);
          return;
        }
      }

      // If no project-specific settings, get the first available settings for the user
      const { data: userSettings, error: userError } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (userError) {
        console.error('Error loading feedback settings:', userError);
        setError(userError.message);
        return;
      }

      if (userSettings) {
        setSettings(userSettings);
      } else {
        // Create default settings if none exist
        await createDefaultSettings();
      }
    } catch (err) {
      console.error('Error loading feedback settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    if (!user?.id) return;

    try {
      // Get the first project for this user
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (projectError || !project) {
        console.error('No project found for user:', projectError);
        setError('No project found. Please create a project first.');
        return;
      }

      const defaultSettings: Partial<FeedbackSettings> = {
        user_id: user.id,
        project_id: project.id,
        widget_title: 'Share your feedback with us!',
        widget_color: '#3B82F6',
        greeting_text: 'Welcome, tell us what\'s on your mind',
        default_branding: {}
      };

      const { data: newSettings, error: insertError } = await supabase
        .from('feedback_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating default settings:', insertError);
        setError(insertError.message);
        return;
      }

      setSettings(newSettings);
    } catch (err) {
      console.error('Error creating default settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to create default settings');
    }
  };

  const updateSettings = async (updates: Partial<FeedbackSettings>) => {
    if (!settings) return;

    try {
      const { data, error } = await supabase
        .from('feedback_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating settings:', error);
        throw error;
      }

      setSettings(data);
      return data;
    } catch (err) {
      console.error('Error updating settings:', err);
      throw err;
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: loadSettings
  };
};