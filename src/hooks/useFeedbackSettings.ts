// src/hooks/useFeedbackSettings.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FeedbackSettings {
  id: string;
  user_id: string;
  project_id: string;
  widget_title: string;
  widget_color: string;
  greeting_text: string;
  customer_satisfaction_enabled: boolean;
  product_feedback_enabled: boolean;
  customer_survey_url: string;
  product_feedback_url: string;
  widget_code: string;
  business_name: string | null;
  logo_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export const useFeedbackSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') {
          console.error('❌ Error loading settings:', error);
        }
        return;
      }

      if (data) setSettings(data);
    } catch (error) {
      console.error('❌ Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: FeedbackSettings) => {
    if (!user) throw new Error('User not authenticated');
    setSaving(true);

    try {
      const dataToSave = {
        ...newSettings,
        user_id: user.id,
        business_name: newSettings.business_name || null,
        logo_url: newSettings.logo_url || null,
      };

      const { data, error } = await supabase
        .from('feedback_settings')
        .upsert(dataToSave, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) throw error;
      setSettings(data);
      return data;
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // === NEW HELPERS ===
  const uploadLogo = async (logoUrl: string) => {
    if (!settings) return;
    const newSettings = { ...settings, logo_url: logoUrl };
    await saveSettings(newSettings);
    return newSettings;
  };

  const removeLogo = async () => {
    if (!settings) return;
    const newSettings = { ...settings, logo_url: null };
    await saveSettings(newSettings);
    return newSettings;
  };

  const regenerateUrls = async () => {
    if (!user || !settings) throw new Error('User not authenticated or settings not loaded');

    const newProjectId = crypto.randomUUID();
    const baseUrl = window.location.origin;

    const newSettings = {
      ...settings,
      project_id: newProjectId,
      customer_survey_url: `${baseUrl}/survey/${newProjectId}`,
      product_feedback_url: `${baseUrl}/feedback/${newProjectId}`,
      widget_code: `<script src="${baseUrl}/widget.js" data-project-id="${newProjectId}"></script>`,
    };

    await saveSettings(newSettings);
    return newSettings;
  };

  return {
    settings,
    loading,
    saving,
    setSettings,
    saveSettings,
    uploadLogo,
    removeLogo,
    regenerateUrls,
    reloadSettings: loadSettings,
  };
};
