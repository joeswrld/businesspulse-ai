import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const FeedbackSettings = () => {
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    customerSatisfactionEnabled: true,
    productFeedbackEnabled: true,
    theme: 'light',
    brandColor: '#3B82F6',
    greeting: 'We value your feedback!'
  });

  useEffect(() => {
    if (user) {
      initializeProject();
    }
  }, [user]);

  const initializeProject = async () => {
    try {
      setLoading(true);
      
      // Call the safe RPC function
      const { data, error } = await supabase.rpc("create_project_with_settings", {
        user_id: user.id,
      });

      if (error || !data || data.length === 0) {
        console.error("❌ Project creation failed:", error || "No data returned");
        throw new Error("Failed to initialize project");
      }

      const project = data[0];
      setProject(project);

      // Load existing widget settings
      const { data: widgetSettings } = await supabase
        .from('widget_settings')
        .select('*')
        .eq('project_id', project.id)
        .single();

      if (widgetSettings) {
        setSettings(prev => ({
          ...prev,
          customerSatisfactionEnabled: widgetSettings.customer_satisfaction_enabled ?? prev.customerSatisfactionEnabled,
          productFeedbackEnabled: widgetSettings.product_feedback_enabled ?? prev.productFeedbackEnabled,
          theme: widgetSettings.theme ?? prev.theme,
          brandColor: widgetSettings.brand_color ?? prev.brandColor,
          greeting: widgetSettings.greeting ?? prev.greeting
        }));
      }

    } catch (error) {
      console.error("Error initializing project:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!project) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('widget_settings')
        .upsert({
          project_id: project.id,
          customer_satisfaction_enabled: settings.customerSatisfactionEnabled,
          product_feedback_enabled: settings.productFeedbackEnabled,
          theme: settings.theme,
          brand_color: settings.brandColor,
          greeting: settings.greeting,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Show success notification
      console.log("✅ Settings saved successfully");
    } catch (error) {
      console.error("❌ Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const generateEmbedCode = () => {
    if (!project) return '';
    
    return `<!-- NoteX Feedback Widget -->
<div id="notex-widget"></div>
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://your-domain.com/widget.js';
    script.setAttribute('data-project-id', '${project.id}');
    script.setAttribute('data-theme', '${settings.theme}');
    script.setAttribute('data-brand-color', '${settings.brandColor}');
    document.head.appendChild(script);
  })();
</script>`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateEmbedCode());
      console.log("✅ Embed code copied to clipboard");
    } catch (error) {
      console.error("❌ Failed to copy to clipboard:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Feedback Widget Settings</h1>
        
        {/* Project ID Section */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project ID
          </label>
          <input
            type="text"
            value={project?.id || ''}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
            placeholder="Loading project ID..."
          />
          <p className="mt-1 text-xs text-gray-500">
            This is your unique project identifier used in the widget embed code.
          </p>
        </div>

        {/* Form Type Toggles */}
        <div className="space-y-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900">Feedback Forms</h3>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Customer Satisfaction Form</h4>
              <p className="text-sm text-gray-500">Collect satisfaction ratings and feedback</p>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, customerSatisfactionEnabled: !prev.customerSatisfactionEnabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                settings.customerSatisfactionEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.customerSatisfactionEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Product Feedback Form</h4>
              <p className="text-sm text-gray-500">Collect detailed product feedback and suggestions</p>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, productFeedbackEnabled: !prev.productFeedbackEnabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                settings.productFeedbackEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.productFeedbackEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Widget Customization */}
        <div className="space-y-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900">Widget Customization</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <select
                value={settings.theme}
                onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={settings.brandColor}
                  onChange={(e) => setSettings(prev => ({ ...prev, brandColor: e.target.value }))}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.brandColor}
                  onChange={(e) => setSettings(prev => ({ ...prev, brandColor: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Greeting Message
            </label>
            <input
              type="text"
              value={settings.greeting}
              onChange={(e) => setSettings(prev => ({ ...prev, greeting: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter a friendly greeting for your users"
            />
          </div>
        </div>

        {/* Embed Code */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Embed Code</h3>
          <p className="text-sm text-gray-600 mb-3">
            Copy and paste this code into your website's HTML to display the feedback widget.
          </p>
          <div className="relative">
            <textarea
              value={generateEmbedCode()}
              readOnly
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackSettings;
