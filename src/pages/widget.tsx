// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ImagePlus, Save, Palette } from 'lucide-react';

type FeedbackSettingsRow = {
  id: string;
  user_id: string | null;
  project_id: string;
  brand_color: string | null;
  logo_url: string | null;
  greeting_text: string | null;
};

const WidgetSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [row, setRow] = useState<FeedbackSettingsRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Load or initialize settings for the current user
  useEffect(() => {
    const init = async () => {
      if (!user) return;

      // Try loading existing settings by user_id
      const { data: existing, error } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        toast.error('Failed loading settings');
        return;
      }

      if (existing) {
        setRow(existing as any);
        return;
      }

      // If none exists, create a new settings row with a project_id
      const newProjectId = crypto.randomUUID();
      const { data: created, error: insertErr } = await supabase
        .from('feedback_settings')
        .insert({
          user_id: user.id,
          project_id: newProjectId,
          brand_color: '#3B82F6',
          greeting_text: 'Share your feedback with us!',
        })
        .select('*')
        .single();

      if (insertErr) {
        console.error(insertErr);
        toast.error('Failed creating settings');
        return;
      }
      setRow(created as any);
    };
    init();
  }, [user]);

  const uploadLogo = async (file: File) => {
    if (!row) return;
    setUploading(true);
    try {
      const path = `${row.project_id}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('widget-logos')
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage
        .from('widget-logos')
        .getPublicUrl(data.path);
      setRow(prev => (prev ? { ...prev, logo_url: pub.publicUrl } : prev));
      toast.success('Logo uploaded');
    } catch (e: any) {
      console.error(e);
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
      .upsert({
        id: row.id,
        user_id: user?.id ?? null,
        project_id: row.project_id || crypto.randomUUID(),
        brand_color: row.brand_color || '#3B82F6',
        logo_url: row.logo_url || null,
        greeting_text: row.greeting_text || 'Share your feedback with us!',
      })
      .eq('id', row.id);
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error('Save failed');
    } else {
      toast.success('Settings saved');
    }
  };

  const scriptSnippet = useMemo(() => {
    const pid = row?.project_id || '';
    return `<script src="https://notex.com.ng/widget.js" data-user-id="${pid}"></script>`;
  }, [row?.project_id]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Feedback Settings</h1>

      {!row ? (
        <div className="text-gray-500 py-12">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Customize Widget</CardTitle>
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

                <div className="space-y-2 md:col-span-2">
                  <Label>Greeting text</Label>
                  <Textarea value={row.greeting_text || ''} onChange={e => setRow({ ...row, greeting_text: e.target.value })} placeholder="Share your feedback with us!" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-3">
                    <Input type="file" accept="image/*" onChange={e => e.target.files && uploadLogo(e.target.files[0])} />
                    <Button type="button" variant="outline" disabled={uploading}>
                      <ImagePlus className="h-4 w-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                  {row.logo_url && (
                    <img src={row.logo_url} alt="Logo" className="h-10 mt-2" />
                  )}
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
                    <p className="font-medium" style={{ color: row.brand_color || '#3B82F6' }}>{row.greeting_text || 'Share your feedback with us!'}</p>
                  </div>
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

export default WidgetSettingsPage;
