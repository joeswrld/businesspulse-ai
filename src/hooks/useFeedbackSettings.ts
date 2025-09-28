import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [settings, setSettings] = useState<FeedbackSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.rpc('get_or_create_feedback_settings', {
        p_user_id: user.id
      });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setSettings(data[0]);
      }
    } catch (error) {
      console.error('Error loading feedback settings:', error);
      toast({
        title: "Error",
        description: "Failed to load feedback settings. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updatedSettings: Partial<FeedbackSettings>) => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.rpc('update_feedback_settings', {
        p_user_id: user.id,
        p_customer_survey_url: updatedSettings.customer_survey_url,
        p_product_feedback_url: updatedSettings.product_feedback_url,
        p_widget_code: updatedSettings.widget_code
      });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        setSettings(data[0]);
        toast({
          title: "Success",
          description: "Feedback settings saved successfully!",
          variant: "default",
        });
        return data[0];
      }
    } catch (error) {
      console.error('Error saving feedback settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const regenerateUrls = () => {
    if (!settings) return;
    
    const baseUrl = 'https://notex.com.ng';
    const newProjectId = crypto.randomUUID();
    
    const updatedSettings = {
      ...settings,
      customer_survey_url: `${baseUrl}/survey/${newProjectId}`,
      product_feedback_url: `${baseUrl}/feedback/${newProjectId}`,
      widget_code: `<script src="${baseUrl}/widget.js" data-project-id="${newProjectId}"></script>`
    };
    
    setSettings(updatedSettings);
    return updatedSettings;
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    saving,
    loadSettings,
    saveSettings,
    regenerateUrls,
    setSettings
  };
};