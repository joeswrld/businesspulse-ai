import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface FeedbackSettings {
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

  // Suppress MetaMask warning
  if (!window.ethereum) {
    console.debug("No Ethereum provider detected — safe to ignore");
  }

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Call RPC function to get or create settings
      const { data, error } = await supabase.rpc('get_or_create_feedback_settings', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('Error loading feedback settings:', error);
        throw error;
      }

      setSettings(data);
      console.log('✅ Feedback settings loaded:', data);
    } catch (error) {
      console.error('Failed to load feedback settings:', error);
      // Don't throw - let component handle gracefully
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updatedSettings: FeedbackSettings) => {
    if (!user) return;

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
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving settings:', error);
        throw error;
      }

      setSettings(updatedSettings);
      console.log('✅ Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const regenerateUrls = async () => {
    if (!user || !settings) return;

    try {
      setSaving(true);
      const baseUrl = 'https://notex.com.ng';
      const newProjectId = crypto.randomUUID();

      const updatedSettings = {
        ...settings,
        project_id: newProjectId,
        customer_survey_url: `${baseUrl}/survey/${user.id}`,
        product_feedback_url: `${baseUrl}/feedback/${user.id}`,
        widget_code: `<script src="${baseUrl}/widget.js" data-user-id="${user.id}"></script>`
      };

      const { error } = await supabase
        .from('feedback_settings')
        .update({
          project_id: newProjectId,
          customer_survey_url: updatedSettings.customer_survey_url,
          product_feedback_url: updatedSettings.product_feedback_url,
          widget_code: updatedSettings.widget_code,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error regenerating URLs:', error);
        throw error;
      }

      setSettings(updatedSettings);
      console.log('✅ URLs regenerated successfully');
    } catch (error) {
      console.error('Failed to regenerate URLs:', error);
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
    loadSettings
  };
};
