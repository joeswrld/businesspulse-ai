import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Camera, Save, User as UserIcon, Mail } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({ full_name: '', email: '' });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const initials = useMemo(() => {
    const name = form.full_name || user?.email || '';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return (name[0] || 'U').toUpperCase();
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  }, [form.full_name, user?.email]);

  const resolveAvatarUrl = useCallback(async (path: string | null) => {
    if (!path) {
      setAvatarUrl(null);
      return;
    }
    try {
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      if (pub?.publicUrl) {
        setAvatarUrl(pub.publicUrl);
        return;
      }
      const { data: signed } = await supabase.storage.from('avatars').createSignedUrl(path, 60 * 60);
      if (signed?.signedUrl) {
        setAvatarUrl(signed.signedUrl);
        return;
      }
      setAvatarUrl(null);
    } catch {
      setAvatarUrl(null);
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile(data as UserProfile);
        setForm({ full_name: data.full_name || '', email: data.email || user.email || '' });
        await resolveAvatarUrl(data.avatar_url);
      } else {
        // Initialize form with auth details if no profile row yet
        setForm({ full_name: '', email: user.email || '' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to load profile', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast, resolveAvatarUrl]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('profile-realtime-profile-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` }, async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const next = payload.new as UserProfile;
          setProfile(next);
          setForm({ full_name: next.full_name || '', email: next.email || user.email || '' });
          await resolveAvatarUrl(next.avatar_url);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, resolveAvatarUrl]);

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: form.full_name,
          email: form.email,
          avatar_url: profile?.avatar_url ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      if (error) throw error;
      toast({ title: 'Profile saved', description: 'Your profile has been updated.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const onPickAvatar = () => fileInputRef.current?.click();

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ user_id: user.id, avatar_url: filePath, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (updateError) throw updateError;

      await resolveAvatarUrl(filePath);
      toast({ title: 'Avatar updated', description: 'Your profile photo has been updated.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message || 'Could not upload avatar', variant: 'destructive' });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="mt-2 text-lg text-gray-600">Manage your personal information in real time.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Card className="bg-white shadow-sm border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Account Profile
            </CardTitle>
            <CardDescription>Update your name, email, and profile photo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="Avatar" />
                    ) : (
                      <AvatarFallback>{initials}</AvatarFallback>
                    )}
                  </Avatar>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                    onClick={onPickAvatar}
                    disabled={avatarUploading}
                  >
                    {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
                </div>
                <div className="text-sm text-gray-600">
                  <div className="font-medium">Profile Photo</div>
                  <div>PNG, JPG up to 5MB</div>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" className="mt-1" value={form.full_name} onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))} placeholder="Your full name" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder="you@example.com" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={onSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;