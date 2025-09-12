// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import type { User } from '@supabase/supabase-js';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type FeedbackSettings = {
  id?: string;
  user_id: string;
  project_id: string;
  brand_color?: string | null;
  logo_url?: string | null;
  greeting_text?: string | null;
};

export default function WidgetSettingsPage() {
  const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string), []);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [projectId, setProjectId] = useState<string>('');
  const [brandColor, setBrandColor] = useState<string>('#7c3aed');
  const [greetingText, setGreetingText] = useState<string>('Hi! We would love your feedback.');
  const [logoUrl, setLogoUrl] = useState<string>('');

  const [showEmbed, setShowEmbed] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: userResp, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const currentUser = userResp.user ?? null;
        if (!currentUser) {
          throw new Error('You must be logged in to view this page.');
        }
        if (!isMounted) return;
        setUser(currentUser);

        const { data: settings, error: fetchErr } = await supabase
          .from('feedback_settings')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle();
        if (fetchErr) throw fetchErr;

        if (settings) {
          setProjectId(settings.project_id);
          setBrandColor(settings.brand_color || '#7c3aed');
          setGreetingText(settings.greeting_text || 'Hi! We would love your feedback.');
          setLogoUrl(settings.logo_url || '');
        } else {
          // Prepare a project id but don't persist until save
          setProjectId(crypto.randomUUID());
        }
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message ?? 'Failed to load settings.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const handleLogoUpload = async (file: File) => {
    if (!user) return;
    setError(null);
    setSuccess(null);
    const fileExt = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${fileExt}`;
    const { error: uploadErr } = await supabase.storage.from('widget-logos').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadErr) {
      setError(uploadErr.message);
      return;
    }
    const { data: publicUrlData } = supabase.storage.from('widget-logos').getPublicUrl(path);
    setLogoUrl(publicUrlData.publicUrl);
    setSuccess('Logo uploaded');
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const ensureProjectId = projectId || crypto.randomUUID();
      const payload: FeedbackSettings = {
        user_id: user.id,
        project_id: ensureProjectId,
        brand_color: brandColor,
        logo_url: logoUrl || null,
        greeting_text: greetingText,
      };

      const { error: upsertErr } = await supabase
        .from('feedback_settings')
        .upsert(payload, { onConflict: 'project_id' });
      if (upsertErr) throw upsertErr;
      setProjectId(ensureProjectId);
      setSuccess('Settings saved');
      setShowEmbed(true);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const embedCode = `<script src=\"https://notex.com.ng/widget.js\" data-user-id=\"${projectId}\"></script>`;

  return (
    <>
      <Head>
        <title>Feedback Widget Settings • NoteX</title>
      </Head>
      <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight mb-4">Feedback Widget Settings</h1>

        {error ? (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700">{success}</div>
        ) : null}

        <Card className="p-4 sm:p-6">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading settings…</div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Brand color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="h-10 w-16 cursor-pointer rounded border"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                    />
                    <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Logo</label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleLogoUpload(file);
                      }}
                    />
                  </div>
                  {logoUrl ? (
                    <div className="mt-2">
                      <img src={logoUrl} alt="Logo preview" className="h-12 w-auto rounded border" />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Greeting text</label>
                <Textarea
                  value={greetingText}
                  onChange={(e) => setGreetingText(e.target.value)}
                  placeholder="Write a friendly greeting for your feedback widget..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save settings'}
                </Button>
                {projectId ? (
                  <div className="text-xs text-muted-foreground">Project ID: {projectId}</div>
                ) : null}
              </div>
            </div>
          )}
        </Card>

        {showEmbed && projectId ? (
          <Card className="mt-6 p-4 sm:p-6">
            <div className="space-y-3">
              <div className="text-sm font-medium">Embed code</div>
              <div className="rounded-md border bg-muted p-3 text-xs overflow-x-auto">
                <code>{embedCode}</code>
              </div>
              <div className="text-xs text-muted-foreground">
                Paste this before the closing <code>&lt;/body&gt;</code> tag on your website.
              </div>
            </div>
          </Card>
        ) : null}

        <div className="mt-6 text-xs text-muted-foreground">
          Feedback submissions created via this widget will be stored in the <code>feedback</code> table and linked by <code>project_id</code>.
        </div>
      </div>
    </>
  );
}

