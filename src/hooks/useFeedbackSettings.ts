// Create this file: src/hooks/useFeedbackSettings.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackSettings {
  id: string;
  user_id: string;
  project_id: string;
  customer_survey_url: string;
  product_feedback_url: string;
  widget_code: string;
  widget_title: string;
  widget_color: string;
  greeting_text: string;
  customer_satisfaction_enabled: boolean;
  product_feedback_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const useFeedbackSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Loading feedback settings for user:', user.id);

      const { data: existingSettings, error } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error loading settings:', error);
        throw error;
      }

      if (!existingSettings) {
        console.log('📝 Creating new feedback settings...');
        
        const newProjectId = crypto.randomUUID();
        const baseUrl = window.location.origin;

        const newSettings = {
          user_id: user.id,
          project_id: newProjectId,
          customer_survey_url: `${baseUrl}/csat/${newProjectId}`,
          product_feedback_url: `${baseUrl}/product-feedback/${newProjectId}`,
          widget_code: `<script src="${baseUrl}/widget.js" data-project-id="${newProjectId}"></script>`,
          widget_title: 'Share Your Feedback',
          widget_color: '#3B82F6',
          greeting_text: 'We value your feedback!',
          customer_satisfaction_enabled: true,
          product_feedback_enabled: true
        };

        const { data: created, error: createError } = await supabase
          .from('feedback_settings')
          .insert(newSettings)
          .select()
          .single();

        if (createError) {
          console.error('❌ Error creating settings:', createError);
          throw createError;
        }

        setSettings(created);
        console.log('✅ Created settings:', created);
      } else {
        setSettings(existingSettings);
        console.log('✅ Loaded existing settings:', existingSettings);
      }
    } catch (error) {
      console.error('❌ Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveSettings = useCallback(async (updatedSettings: FeedbackSettings) => {
    if (!user) return;

    try {
      setSaving(true);
      console.log('💾 Saving settings...', updatedSettings);

      const { error } = await supabase
        .from('feedback_settings')
        .update({
          widget_title: updatedSettings.widget_title,
          widget_color: updatedSettings.widget_color,
          greeting_text: updatedSettings.greeting_text,
          customer_satisfaction_enabled: updatedSettings.customer_satisfaction_enabled,
          product_feedback_enabled: updatedSettings.product_feedback_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error saving settings:', error);
        throw error;
      }

      setSettings(updatedSettings);
      console.log('✅ Settings saved successfully');
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [user]);

  const regenerateUrls = useCallback(async () => {
    if (!user || !settings) return;

    try {
      setSaving(true);
      console.log('🔄 Regenerating URLs...');

      const newProjectId = crypto.randomUUID();
      const baseUrl = window.location.origin;

      const updatedSettings = {
        project_id: newProjectId,
        customer_survey_url: `${baseUrl}/csat/${newProjectId}`,
        product_feedback_url: `${baseUrl}/product-feedback/${newProjectId}`,
        widget_code: `<script src="${baseUrl}/widget.js" data-project-id="${newProjectId}"></script>`,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('feedback_settings')
        .update(updatedSettings)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error regenerating URLs:', error);
        throw error;
      }

      setSettings({ ...settings, ...updatedSettings });
      console.log('✅ URLs regenerated successfully');
    } catch (error) {
      console.error('❌ Failed to regenerate URLs:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [user, settings]);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user, loadSettings]);

  return {
    settings,
    loading,
    saving,
    setSettings,
    saveSettings,
    regenerateUrls,
    reloadSettings: loadSettings
  };
};
