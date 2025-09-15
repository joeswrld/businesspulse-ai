import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, Settings, Copy, Check } from 'lucide-react'
import WidgetPreview from '@/components/WidgetPreview'

interface FeedbackSettings {
  id: string
  user_id: string
  project_id: string
  widget_title: string | null
  widget_color: string | null
  greeting_text: string | null
  created_at: string
}

const FeedbackSettingsPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [settings, setSettings] = useState<FeedbackSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [formData, setFormData] = useState({
    widget_title: 'Share your feedback with us!',
    widget_color: '#3B82F6',
    greeting_text: 'Welcome, tell us what\'s on your mind'
  })

  useEffect(() => {
    if (user?.id) loadSettings()
  }, [user?.id])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_or_create_feedback_settings', { p_user_id: user?.id! })
      if (error) throw error

      if (data && data.length > 0) {
        const s = data[0]
        setSettings(s)
        setFormData({
          widget_title: s.widget_title || 'Share your feedback with us!',
          widget_color: s.widget_color || '#3B82F6',
          greeting_text: s.greeting_text || 'Welcome, tell us what\'s on your mind'
        })
      }
    } catch (err) {
      console.error('Error loading settings:', err)
      toast({ title: 'Error', description: 'Failed to load feedback settings', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user?.id || !settings) return
    try {
      setSaving(true)
      const { error } = await supabase.from('feedback_settings')
        .update({
          widget_title: formData.widget_title,
          widget_color: formData.widget_color,
          greeting_text: formData.greeting_text
        })
        .eq('id', settings.id)

      if (error) throw error
      toast({ title: 'Success', description: 'Feedback settings saved successfully!' })
      await loadSettings()
    } catch (err) {
      console.error('Error saving settings:', err)
      toast({ title: 'Error', description: 'Failed to save feedback settings', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleCopyEmbedCode = async () => {
    if (!settings) return
    const code = `<script src="https://notex.com.ng/widget.js" data-project-id="${settings.project_id}"></script>`
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast({ title: 'Copied', description: 'Embed code copied to clipboard' })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy embed code:', err)
      toast({ title: 'Error', description: 'Failed to copy embed code', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading feedback settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">Feedback Settings</h1>
          <p className="text-muted-foreground">Configure your feedback widget appearance and behavior</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Widget Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Widget Configuration</CardTitle>
            <CardDescription>Customize how your feedback widget appears</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Configuration Form */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Widget Title</Label>
                  <Input
                    value={formData.widget_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, widget_title: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Widget Color</Label>
                  <div className="flex items-center space-x-3">
                    <Input
                      type="color"
                      value={formData.widget_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, widget_color: e.target.value }))}
                      className="w-20 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.widget_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, widget_color: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Greeting Text</Label>
                  <Textarea
                    value={formData.greeting_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, greeting_text: e.target.value }))}
                    rows={3}
                  />
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Settings</>}
                </Button>
              </div>

              {/* Live Preview */}
              <div>
                <WidgetPreview
                  widgetTitle={formData.widget_title}
                  widgetColor={formData.widget_color}
                  greetingText={formData.greeting_text}
                  projectId={settings?.project_id}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Project ID */}
        {settings && (
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>Your unique project identifier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Project ID</Label>
                <div className="flex items-center space-x-2">
                  <Input value={settings.project_id} readOnly className="font-mono" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(settings.project_id)
                      toast({ title: 'Copied', description: 'Project ID copied to clipboard' })
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">Use this Project ID in your embed code</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Embed Code */}
        {settings && (
          <Card>
            <CardHeader>
              <CardTitle>Widget Embed Code</CardTitle>
              <CardDescription>Copy this code into your site</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm">{`<script src="https://notex.com.ng/widget.js" data-project-id="${settings.project_id}"></script>`}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleCopyEmbedCode}
                >
                  {copied ? <><Check className="h-4 w-4 mr-2" />Copied!</> : <><Copy className="h-4 w-4 mr-2" />Copy</>}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Paste this before the closing <code>&lt;/body&gt;</code> tag on your site
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default FeedbackSettingsPage
