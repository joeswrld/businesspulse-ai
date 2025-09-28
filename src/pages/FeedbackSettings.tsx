import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const FeedbackSettings = () => {
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      
      // First, try the RPC function
      let project = null;
      const { data: rpcData, error: rpcError } = await supabase.rpc("create_project_with_settings", {
        user_id: user.id,
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        project = rpcData[0];
      } else {
        // Fallback: Manual project creation if RPC doesn't exist
        console.log("🔄 RPC failed, falling back to manual project creation...");
        
        // Check if user already has a project
        const { data: existingProjects } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);

        if (existingProjects && existingProjects.length > 0) {
          project = existingProjects[0];
        } else {
          // Create new project manually
          const { data: newProject, error: createError } = await supabase
            .from('projects')
            .insert([
              {
                user_id: user.id,
                name: 'Default Project',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ])
            .select()
            .single();

          if (createError) throw createError;
          project = newProject;
        }

        // Ensure widget settings exist
        if (project) {
          await supabase
            .from('widget_settings')
            .upsert({
              project_id: project.id,
              customer_satisfaction_enabled: true,
              product_feedback_enabled: true,
              theme: 'light',
              brand_color: '#3B82F6',
              greeting: 'We value your feedback!',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        }
      }

      if (!project) {
        throw new Error("Failed to create or find project");
      }

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

    } catch (error: any) {
      console.error("Error initializing project:", error);
      setError(error.message || "Failed to initialize project");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!project) return;

    try {
      setSaving(true);
      setError(null);

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

      console.log("✅ Settings saved successfully");
    } catch (error: any) {
      console.error("❌ Error saving settings:", error);
      setError(error.message || "Failed to save settings");
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

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={initializeProject}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
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
