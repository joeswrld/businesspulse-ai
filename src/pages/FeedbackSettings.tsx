import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ImagePlus, Save, Palette, Loader2 } from 'lucide-react';

type SettingsRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  project_id_locked: boolean;
  title: string;
  show_name: boolean;
  show_email: boolean;
  button_text: string;
  redirect_url: string | null;
  theme: 'light' | 'dark';
  brand_color: string;
  notify_email: string | null;
  created_at: string;
  updated_at: string;
};

const FeedbackSettings: React.FC = () => {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [row, setRow] = useState<SettingsRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Load settings by user_id
        const { data: existing, error } = await supabase
          .from('feedback_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading feedback settings:', error);
          toast.error('Failed to load settings');
        }

        if (!existing) {
          // Create default settings if none exist
          const generatedProjectId = (globalThis.crypto?.randomUUID?.() || user.id) as string;
          const payload = {
            user_id: user.id,
            project_id: generatedProjectId,
            project_id_locked: false,
            title: 'Share your feedback with us!',
            show_name: true,
            show_email: false,
            button_text: 'Send Feedback',
            redirect_url: null,
            theme: 'light' as const,
            brand_color: '#3B82F6',
            notify_email: user.email,
          };
          
          const { data: inserted, error: insertError } = await supabase
            .from('feedback_settings')
            .insert(payload)
            .select('*')
            .single();
            
          if (insertError) {
            console.error('Error creating feedback settings:', insertError);
            toast.error('Failed to create settings');
            return;
          }
          
          setRow(inserted);
          setProjectId(inserted.project_id);
        } else {
          setRow(existing);
          setProjectId(existing.project_id);
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

  const uploadLogo = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from('widget-logos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('widget-logos').getPublicUrl(data.path);
      // Note: The current table structure doesn't have logo_url field, but we'll keep this for future use
      toast.success('Logo uploaded successfully');
    } catch (e: any) {
      console.error(e);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!user || !row) return;
    setSaving(true);
    try {
      // Ensure we have a project_id
      const ensuredProjectId = row.project_id || (globalThis.crypto?.randomUUID?.() as string) || user.id;
      
      const payload = {
        user_id: user.id,
        project_id: ensuredProjectId,
        project_id_locked: row.project_id_locked,
        title: row.title,
        show_name: row.show_name,
        show_email: row.show_email,
        button_text: row.button_text,
        redirect_url: row.redirect_url,
        theme: row.theme,
        brand_color: row.brand_color,
        notify_email: row.notify_email,
        updated_at: new Date().toISOString(),
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

      setProjectId(ensuredProjectId);
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
              <CardTitle>Customization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Brand color</Label>
                  <div className="flex items-center gap-2">
                    <Input type="color" value={row.brand_color} onChange={e => setRow({ ...row, brand_color: e.target.value })} className="w-12 p-1" />
                    <Input value={row.brand_color} onChange={e => setRow({ ...row, brand_color: e.target.value })} />
                    <Palette className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Title/Greeting</Label>
                  <Textarea value={row.title} onChange={e => setRow({ ...row, title: e.target.value })} placeholder="Share your feedback with us!" rows={4} />
                </div>
                <div className="space-y-2">
                  <Label>Button Text</Label>
                  <Input value={row.button_text} onChange={e => setRow({ ...row, button_text: e.target.value })} placeholder="Send Feedback" />
                </div>
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={row.theme} onValueChange={v => setRow({ ...row, theme: v as 'light' | 'dark' })}>
                    <SelectTrigger><SelectValue placeholder="Theme" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Project ID</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={row.project_id || ''} 
                      onChange={e => setRow({ ...row, project_id: e.target.value })}
                      placeholder="Enter project ID"
                      disabled={row.project_id_locked}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setRow({ ...row, project_id_locked: !row.project_id_locked })}
                    >
                      {row.project_id_locked ? 'Unlock' : 'Lock'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notification Email</Label>
                  <Input 
                    type="email" 
                    value={row.notify_email || ''} 
                    onChange={e => setRow({ ...row, notify_email: e.target.value })}
                    placeholder="Email for notifications"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium">Show Name Field</p>
                    <p className="text-sm text-gray-500">Ask users for their name</p>
                  </div>
                  <Switch checked={row.show_name} onCheckedChange={v => setRow({ ...row, show_name: v })} />
                </div>
                <div className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium">Show Email Field</p>
                    <p className="text-sm text-gray-500">Ask users for their email</p>
                  </div>
                  <Switch checked={row.show_email} onCheckedChange={v => setRow({ ...row, show_email: v })} />
                </div>
                <div className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium">Lock Project ID</p>
                    <p className="text-sm text-gray-500">Prevent changes to project ID</p>
                  </div>
                  <Switch checked={row.project_id_locked} onCheckedChange={v => setRow({ ...row, project_id_locked: v })} />
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
                <div className={`border rounded-xl p-4 ${row.theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white'}`} style={{ borderColor: row.brand_color }}>
                  <div className="flex items-center gap-3">
                    <p className="font-medium" style={{ color: row.brand_color }}>{row.title}</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {row.show_name && (
                      <div className="text-sm opacity-75">Name: [User input field]</div>
                    )}
                    {row.show_email && (
                      <div className="text-sm opacity-75">Email: [User input field]</div>
                    )}
                    <div className="text-sm opacity-75">Message: [User input field]</div>
                    <Button 
                      size="sm" 
                      className="mt-2" 
                      style={{ backgroundColor: row.brand_color }}
                    >
                      {row.button_text}
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

