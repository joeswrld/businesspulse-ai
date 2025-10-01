// ============================================
// FILE 1: src/hooks/useFeedbackSettings.ts
// ============================================

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
      console.log('🔄 Loading feedback settings for user:', user.id);

      const { data, error } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('⚠️ No settings found, will create on first save');
        } else {
          console.error('❌ Error loading settings:', error);
        }
        return;
      }

      if (data) {
        console.log('✅ Loaded existing settings:', data);
        setSettings(data);
      }
    } catch (error) {
      console.error('❌ Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updatedSettings: FeedbackSettings) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setSaving(true);

    try {
      console.log('💾 Saving settings with logo_url:', updatedSettings.logo_url);
      console.log('💾 Saving settings with business_name:', updatedSettings.business_name);

      // Prepare data for upsert - MUST include logo_url and business_name
      const dataToSave = {
        user_id: user.id,
        project_id: updatedSettings.project_id,
        widget_title: updatedSettings.widget_title,
        widget_color: updatedSettings.widget_color,
        greeting_text: updatedSettings.greeting_text,
        customer_satisfaction_enabled: updatedSettings.customer_satisfaction_enabled,
        product_feedback_enabled: updatedSettings.product_feedback_enabled,
        customer_survey_url: updatedSettings.customer_survey_url,
        product_feedback_url: updatedSettings.product_feedback_url,
        widget_code: updatedSettings.widget_code,
        business_name: updatedSettings.business_name || null,
        logo_url: updatedSettings.logo_url || null,
      };

      const { data, error } = await supabase
        .from('feedback_settings')
        .upsert(dataToSave, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error saving settings:', error);
        throw error;
      }

      console.log('✅ Settings saved successfully with logo:', data.logo_url);
      console.log('✅ Settings saved successfully with name:', data.business_name);
      setSettings(data);
      
      return data;
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const regenerateUrls = async () => {
    if (!user || !settings) {
      throw new Error('User not authenticated or settings not loaded');
    }

    try {
      const newProjectId = crypto.randomUUID();
      const baseUrl = window.location.origin;

      const updatedSettings = {
        ...settings,
        project_id: newProjectId,
        customer_survey_url: `${baseUrl}/survey/${newProjectId}`,
        product_feedback_url: `${baseUrl}/feedback/${newProjectId}`,
        widget_code: `<script src="${baseUrl}/widget.js" data-project-id="${newProjectId}"></script>`,
      };

      await saveSettings(updatedSettings);
      setSettings(updatedSettings);
      
      return updatedSettings;
    } catch (error) {
      console.error('❌ Failed to regenerate URLs:', error);
      throw error;
    }
  };

  return {
    settings,
    loading,
    saving,
    setSettings,
    saveSettings,
    regenerateUrls,
    reloadSettings: loadSettings,
  };
};


// ============================================
// FILE 2: Fix for CSATForm.tsx interface
// ============================================
// UPDATE the FeedbackSettings interface in src/pages/CSATForm.tsx to:

interface FeedbackSettings {
  id: string;
  project_id: string;
  user_id: string;
  widget_title: string;
  widget_color: string;
  greeting_text: string;
  customer_satisfaction_enabled: boolean;
  business_name?: string | null;  // ✅ ADD THIS
  logo_url?: string | null;        // ✅ ADD THIS
}


// ============================================
// FILE 3: Fix for ProductFeedback.tsx interface
// ============================================
// UPDATE the FeedbackSettings interface in src/pages/ProductFeedback.tsx to:

interface FeedbackSettings {
  id: string;
  project_id: string;
  user_id: string;
  widget_title: string;
  widget_color: string;
  greeting_text: string;
  product_feedback_enabled: boolean;
  business_name?: string | null;  // ✅ ADD THIS
  logo_url?: string | null;        // ✅ ADD THIS
}


// ============================================
// CRITICAL FIX: Update FeedbackSettings.tsx
// ============================================
// In the handleLogoUpload function, after updating the logo URL,
// you MUST call saveSettings immediately:

// REPLACE this section in handleLogoUpload:
      // Update settings
      setSettings({ ...settings!, logo_url: publicUrl });

      toast({
        title: "Logo Uploaded!",
        description: "Your logo has been uploaded successfully.",
      });

// WITH THIS:
      // Update settings in state
      const updatedSettings = { ...settings!, logo_url: publicUrl };
      setSettings(updatedSettings);

      // ✅ SAVE TO DATABASE IMMEDIATELY
      await saveSettings(updatedSettings);

      toast({
        title: "Logo Uploaded!",
        description: "Your logo has been uploaded and saved successfully.",
      });


// ============================================
// CRITICAL FIX 2: Update handleRemoveLogo
// ============================================
// REPLACE this section in handleRemoveLogo:
      setSettings({ ...settings, logo_url: null });

      toast({
        title: "Logo Removed",
        description: "Your logo has been removed.",
      });

// WITH THIS:
      const updatedSettings = { ...settings, logo_url: null };
      setSettings(updatedSettings);

      // ✅ SAVE TO DATABASE IMMEDIATELY
      await saveSettings(updatedSettings);

      toast({
        title: "Logo Removed",
        description: "Your logo has been removed and saved.",
      });
