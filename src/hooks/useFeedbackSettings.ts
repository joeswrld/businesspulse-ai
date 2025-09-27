import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FeedbackSettings {
  id: string;
  project_id: string;
  customer_satisfaction_enabled: boolean;
  product_feedback_enabled: boolean;
  widget_title: string;
  widget_color: string;
  greeting_text: string;
  widget_position: string;
  show_branding: boolean;
  created_at: string;
  updated_at: string;
}

interface UseFeedbackSettingsOptions {
  projectId?: string;
  autoCreate?: boolean;
}

export function useFeedbackSettings(options: UseFeedbackSettingsOptions = {}) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!user || !options.projectId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: settingsData, error: settingsError } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('project_id', options.projectId)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error loading settings:', settingsError);
        throw settingsError;
      }

      if (settingsData) {
        setSettings(settingsData);
      } else if (options.autoCreate) {
        // Create default settings
        const defaultSettings = {
          project_id: options.projectId,
          customer_satisfaction_enabled: true,
          product_feedback_enabled: true,
          widget_title: 'We love your feedback!',
          widget_color: '#3B82F6',
          greeting_text: 'Help us improve by sharing your thoughts',
          widget_position: 'bottom-right',
          show_branding: true
        };

        const { data: newSettings, error: createError } = await supabase
          .from('feedback_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (createError) {
          console.error('Error creating settings:', createError);
          throw createError;
        }

        setSettings(newSettings);
      } else {
        setSettings(null);
      }

    } catch (error) {
      console.error('Error loading settings:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while loading settings');
    } finally {
      setLoading(false);
    }
  }, [user, options.projectId, options.autoCreate]);

  // Load settings when dependencies change
  useEffect(() => {
    if (user && options.projectId) {
      loadSettings();
    }
  }, [loadSettings, user, options.projectId]);

  // Save settings
  const saveSettings = useCallback(async (newSettings: Partial<FeedbackSettings>) => {
    if (!user || !options.projectId) return;

    try {
      setSaving(true);

      const settingsToSave = {
        ...newSettings,
        project_id: options.projectId,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('feedback_settings')
        .upsert(settingsToSave)
        .select()
        .single();

      if (error) {
        console.error('Error saving settings:', error);
        throw error;
      }

      setSettings(data);
      return data;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [user, options.projectId]);

  // Update a specific setting
  const updateSetting = useCallback(async (key: keyof FeedbackSettings, value: any) => {
    if (!settings) return;

    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    
    try {
      await saveSettings(updatedSettings);
    } catch (error) {
      // Revert on error
      setSettings(settings);
      throw error;
    }
  }, [settings, saveSettings]);

  // Get embed code
  const getEmbedCode = useCallback(() => {
    if (!options.projectId) return '';
    return `<script src="${window.location.origin}/widget.js" data-project-id="${options.projectId}"></script>`;
  }, [options.projectId]);

  // Get direct form URLs
  const getFormUrls = useCallback(() => {
    if (!options.projectId) return { satisfaction: '', feedback: '' };
    const baseUrl = window.location.origin;
    return {
      satisfaction: `${baseUrl}/forms/satisfaction?project_id=${options.projectId}`,
      feedback: `${baseUrl}/forms/feedback?project_id=${options.projectId}`
    };
  }, [options.projectId]);

  // Copy embed code to clipboard
  const copyEmbedCode = useCallback(async () => {
    const embedCode = getEmbedCode();
    if (!embedCode) return false;

    try {
      await navigator.clipboard.writeText(embedCode);
      return true;
    } catch (error) {
      console.error('Error copying embed code:', error);
      return false;
    }
  }, [getEmbedCode]);

  return {
    settings,
    loading,
    error,
    saving,
    saveSettings,
    updateSetting,
    getEmbedCode,
    getFormUrls,
    copyEmbedCode,
    refresh: loadSettings
  };
}