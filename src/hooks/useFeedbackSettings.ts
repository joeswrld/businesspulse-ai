import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackSettings {
  id: string;
  user_id: string;
  project_id: string;
  customer_survey_url: string;
  product_feedback_url: string;
  widget_code: string;
  created_at: string;
  updated_at: string;
}

export const useFeedbackSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Try to fetch existing settings
      const { data: existingSettings, error: fetchError } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching settings:', fetchError);
        throw fetchError;
      }

      if (existingSettings) {
        setSettings(existingSettings);
      } else {
        // Create new settings if they don't exist
        const newProjectId = crypto.randomUUID();
        const baseUrl = window.location.origin;

        const newSettings = {
          user_id: user.id,
          project_id: newProjectId,
          customer_survey_url: `${baseUrl}/survey/${newProjectId}?type=satisfaction`,
          product_feedback_url: `${baseUrl}/survey/${newProjectId}?type=product`,
          widget_code: `<script src="${baseUrl}/widget.js" data-project-id="${newProjectId}"></script>`
        };

        const { data: createdSettings, error: createError } = await supabase
          .from('feedback_settings')
          .insert(newSettings)
          .select()
          .single();

        if (createError) {
          console.error('Error creating settings:', createError);
          throw createError;
        }

        setSettings(createdSettings);
      }
    } catch (error) {
      console.error('Error loading feedback settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updatedSettings: FeedbackSettings) => {
    if (!user || !updatedSettings.id) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('feedback_settings')
        .update({
          customer_survey_url: updatedSettings.customer_survey_url,
          product_feedback_url: updatedSettings.product_feedback_url,
          widget_code: updatedSettings.widget_code,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedSettings.id);

      if (error) {
        console.error('Error saving settings:', error);
        throw error;
      }

      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const regenerateUrls = async () => {
    if (!user || !settings) return;

    try {
      setSaving(true);

      // Generate new project ID
      const newProjectId = crypto.randomUUID();
      const baseUrl = window.location.origin;

      const updatedSettings = {
        ...settings,
        project_id: newProjectId,
        customer_survey_url: `${baseUrl}/survey/${newProjectId}?type=satisfaction`,
        product_feedback_url: `${baseUrl}/survey/${newProjectId}?type=product`,
        widget_code: `<script src="${baseUrl}/widget.js" data-project-id="${newProjectId}"></script>`,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('feedback_settings')
        .update({
          project_id: updatedSettings.project_id,
          customer_survey_url: updatedSettings.customer_survey_url,
          product_feedback_url: updatedSettings.product_feedback_url,
          widget_code: updatedSettings.widget_code,
          updated_at: updatedSettings.updated_at
        })
        .eq('id', settings.id);

      if (error) {
        console.error('Error regenerating URLs:', error);
        throw error;
      }

      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error regenerating URLs:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

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
