import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, Palette, Loader2 } from 'lucide-react';

type SettingsRow = {
  id: string;
  user_id: string;
  project_id: string;
  widget_title: string;
  widget_color: string;
  created_at: string;
};

const FeedbackSettings: React.FC = () => {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [row, setRow] = useState<SettingsRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Use the helper function to get or create settings
        const { data: settings, error } = await supabase
          .rpc('get_or_create_feedback_settings', { p_user_id: user.id });

        if (error) {
          console.error('Error loading feedback settings:', error);
          toast.error('Failed to load settings');
          return;
        }

        if (settings && settings.length > 0) {
          const setting = settings[0];
          setRow(setting);
          setProjectId(setting.project_id);
        } else {
          // Fallback: create settings manually
          const { data: inserted, error: insertError } = await supabase
            .from('feedback_settings')
            .insert({
              user_id: user.id,
              widget_title: 'Share your feedback with us!',
              widget_color: '#3B82F6',
            })
            .select('*')
            .single();
            
          if (insertError) {
            console.error('Error creating feedback settings:', insertError);
            toast.error('Failed to create settings');
            return;
          }
          
          setRow(inserted);
          setProjectId(inserted.project_id);
        }
      } catch (error) {
        console.error('Error in init:', error);
        toast.error('Failed to initialize settings');
      } finally {
        setLoading(false);
      }
    };
    
    init();
  }, [user]);


  const save = async () => {
    if (!user || !row) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        widget_title: row.widget_title,
        widget_color: row.widget_color,
      };

      const { error } = await supabase
        .from('feedback_settings')
        .upsert(payload, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      if (error) {
        throw error;
      }

      toast.success('Settings saved successfully!');
    } catch (e) {
      console.error(e);
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const scriptSnippet = useMemo(() => {
    return `<script src="https://notex.com.ng/widget.js" data-project-id="${projectId || ''}"></script>`;
  }, [projectId]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Feedback Widget Settings</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
          <span className="text-gray-600">Loading feedback settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Feedback Widget Settings</h1>

      {!row ? (
        <div className="text-gray-500 py-12">No settings found. Please refresh the page.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Widget Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Widget Title</Label>
                  <Input 
                    value={row.widget_title} 
                    onChange={e => setRow({ ...row, widget_title: e.target.value })} 
                    placeholder="Share your feedback with us!" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Widget Color</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="color" 
                      value={row.widget_color} 
                      onChange={e => setRow({ ...row, widget_color: e.target.value })} 
                      className="w-12 p-1" 
                    />
                    <Input 
                      value={row.widget_color} 
                      onChange={e => setRow({ ...row, widget_color: e.target.value })} 
                      placeholder="#3B82F6"
                    />
                    <Palette className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Project ID</Label>
                  <Input 
                    value={row.project_id || ''} 
                    onChange={e => setRow({ ...row, project_id: e.target.value })}
                    placeholder="Enter project ID"
                    className="md:col-span-2"
                  />
                  <p className="text-sm text-gray-500">This ID is used to identify your feedback submissions</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-xl p-4 bg-white" style={{ borderColor: row.widget_color }}>
                  <div className="flex items-center gap-3">
                    <p className="font-medium" style={{ color: row.widget_color }}>{row.widget_title}</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="text-sm text-gray-600">Message: [User input field]</div>
                    <Button 
                      size="sm" 
                      className="mt-2" 
                      style={{ backgroundColor: row.widget_color }}
                    >
                      Send Feedback
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Embed Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">Add this code to your website to display the feedback widget:</p>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-md text-sm overflow-x-auto">{scriptSnippet}</pre>
                <Button 
                  variant="outline" 
                  onClick={() => { 
                    navigator.clipboard.writeText(scriptSnippet); 
                    toast.success('Embed code copied to clipboard!'); 
                  }}
                  className="w-full"
                >
                  Copy Embed Code
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackSettings;

