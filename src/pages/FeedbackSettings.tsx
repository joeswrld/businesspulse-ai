import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ImagePlus, Save, Palette } from 'lucide-react';

type SettingsRow = {
  id: string;
  project_id: string;
  brand_color: string | null;
  greeting: string | null;
  logo_url: string | null;
  widget_position: 'left' | 'right' | 'bottom' | string;
  show_emojis: boolean | null;
  ask_email: boolean | null;
  allow_screenshots: boolean | null;
  enable_inline: boolean | null;
  enable_chat_style: boolean | null;
};

const FeedbackSettings: React.FC = () => {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [row, setRow] = useState<SettingsRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      const { data: proj } = await supabase
        .from('projects' as any)
        .select('project_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      const pid = (proj as any)?.project_id || user.id;
      setProjectId(pid);

      // Ensure row exists
      const { data } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('project_id', pid)
        .maybeSingle();
      if (!data) {
        const { data: inserted } = await supabase
          .from('feedback_settings')
          .insert({ project_id: pid })
          .select('*')
          .single();
        setRow(inserted as any);
      } else {
        setRow(data as any);
      }
    };
    init();
  }, [user]);

  const uploadLogo = async (file: File) => {
    if (!projectId) return;
    setUploading(true);
    try {
      const path = `${projectId}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('logos').getPublicUrl(data.path);
      setRow(prev => prev ? { ...prev, logo_url: pub.publicUrl } : prev);
      toast.success('Logo uploaded');
    } catch (e: any) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const { error } = await supabase
      .from('feedback_settings')
      .update({
        brand_color: row.brand_color || '#3B82F6',
        greeting: row.greeting || 'Share your feedback with us!',
        logo_url: row.logo_url || null,
        widget_position: row.widget_position || 'right',
        show_emojis: Boolean(row.show_emojis),
        ask_email: Boolean(row.ask_email),
        allow_screenshots: Boolean(row.allow_screenshots),
        enable_inline: Boolean(row.enable_inline),
        enable_chat_style: Boolean(row.enable_chat_style),
      })
      .eq('id', row.id);
    setSaving(false);
    if (!error) toast.success('Settings saved.'); else toast.error('Save failed');
  };

  const scriptSnippet = useMemo(() => {
    return `<script src="https://notex.com.ng/widget.js" data-project-id="${projectId || ''}"></script>`;
  }, [projectId]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Feedback Widget Settings</h1>

      {!row ? (
        <div className="text-gray-500 py-12">Loading...</div>
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
                    <Input type="color" value={row.brand_color || '#3B82F6'} onChange={e => setRow({ ...row, brand_color: e.target.value })} className="w-12 p-1" />
                    <Input value={row.brand_color || '#3B82F6'} onChange={e => setRow({ ...row, brand_color: e.target.value })} />
                    <Palette className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Greeting</Label>
                  <Input value={row.greeting || ''} onChange={e => setRow({ ...row, greeting: e.target.value })} placeholder="Share your feedback with us!" />
                </div>
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-3">
                    <Input type="file" accept="image/*" onChange={e => e.target.files && uploadLogo(e.target.files[0])} />
                    <Button type="button" variant="outline" disabled>
                      <ImagePlus className="h-4 w-4 mr-2" /> Upload
                    </Button>
                  </div>
                  {row.logo_url && (
                    <img src={row.logo_url} alt="Logo" className="h-10 mt-2" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Widget Position</Label>
                  <Select value={(row.widget_position as any) || 'right'} onValueChange={v => setRow({ ...row, widget_position: v as any })}>
                    <SelectTrigger><SelectValue placeholder="Position" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                      <SelectItem value="bottom">Bottom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium">Show Emojis</p>
                    <p className="text-sm text-gray-500">Display emoji quick reactions</p>
                  </div>
                  <Switch checked={Boolean(row.show_emojis)} onCheckedChange={v => setRow({ ...row, show_emojis: Boolean(v) })} />
                </div>
                <div className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium">Ask for Email</p>
                    <p className="text-sm text-gray-500">Collect an optional email</p>
                  </div>
                  <Switch checked={Boolean(row.ask_email)} onCheckedChange={v => setRow({ ...row, ask_email: Boolean(v) })} />
                </div>
                <div className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium">Allow Screenshots</p>
                    <p className="text-sm text-gray-500">Enable screenshot attachments</p>
                  </div>
                  <Switch checked={Boolean(row.allow_screenshots)} onCheckedChange={v => setRow({ ...row, allow_screenshots: Boolean(v) })} />
                </div>
                <div className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium">Inline Feedback</p>
                    <p className="text-sm text-gray-500">Attach widget inline on pages</p>
                  </div>
                  <Switch checked={Boolean(row.enable_inline)} onCheckedChange={v => setRow({ ...row, enable_inline: Boolean(v) })} />
                </div>
                <div className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-medium">Chat-style Popup</p>
                    <p className="text-sm text-gray-500">Use chat bubble experience</p>
                  </div>
                  <Switch checked={Boolean(row.enable_chat_style)} onCheckedChange={v => setRow({ ...row, enable_chat_style: Boolean(v) })} />
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
                <div className="border rounded-xl p-4" style={{ borderColor: row.brand_color || '#3B82F6' }}>
                  <div className="flex items-center gap-3">
                    {row.logo_url && <img src={row.logo_url} alt="Logo" className="h-8" />}
                    <p className="font-medium" style={{ color: row.brand_color || '#3B82F6' }}>{row.greeting || 'Share your feedback with us!'}</p>
                  </div>
                  {Boolean(row.show_emojis) && (
                    <div className="mt-3 text-2xl">😡 😐 😍</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Embed Code</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-md text-sm overflow-x-auto">{scriptSnippet}</pre>
                <Button variant="outline" onClick={() => { navigator.clipboard.writeText(scriptSnippet); toast.success('Copied to clipboard'); }}>Copy</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackSettings;

