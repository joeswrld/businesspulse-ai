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

interface FeedbackSettings {
  id: string
  user_id: string
  project_id: string
  widget_title: string | null
  widget_color: string | null
  greeting_text: string | null
  created_at: string
}

const FeedbackSettings: React.FC = () => {
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
    if (user?.id) {
      loadSettings()
    }
  }, [user?.id])

  const loadSettings = async () => {
    try {
      setLoading(true)
      
      // Use the function to get or create settings
      const { data, error } = await supabase
        .rpc('get_or_create_feedback_settings', { p_user_id: user?.id! })
      
      if (error) {
        console.error('Error loading settings:', error)
        toast({
          title: 'Error',
          description: 'Failed to load feedback settings',
          variant: 'destructive'
        })
        return
      }

      if (data && data.length > 0) {
        const settingsData = data[0]
        setSettings(settingsData)
        setFormData({
          widget_title: settingsData.widget_title || 'Share your feedback with us!',
          widget_color: settingsData.widget_color || '#3B82F6',
          greeting_text: settingsData.greeting_text || 'Welcome, tell us what\'s on your mind'
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load feedback settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user?.id || !settings) return

    try {
      setSaving(true)
      
      const { error } = await supabase
        .from('feedback_settings')
        .update({
          widget_title: formData.widget_title,
          widget_color: formData.widget_color,
          greeting_text: formData.greeting_text
        })
        .eq('id', settings.id)

      if (error) {
        console.error('Error saving settings:', error)
        toast({
          title: 'Error',
          description: 'Failed to save feedback settings',
          variant: 'destructive'
        })
        return
      }

      toast({
        title: 'Success',
        description: 'Feedback settings saved successfully!'
      })

      // Reload settings to get updated data
      await loadSettings()
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to save feedback settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCopyEmbedCode = async () => {
    if (!settings) return
    
    const embedCode = `<script src="https://notex.com.ng/widget.js" data-project-id="${settings.project_id}"></script>`
    
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      toast({
        title: 'Copied',
        description: 'Embed code copied to clipboard'
      })
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
      toast({
        title: 'Error',
        description: 'Failed to copy embed code',
        variant: 'destructive'
      })
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
          <p className="text-muted-foreground">
            Configure your feedback widget appearance and behavior
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Widget Configuration</CardTitle>
            <CardDescription>
              Customize how your feedback widget appears to users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="widget_title">Widget Title</Label>
              <Input
                id="widget_title"
                value={formData.widget_title}
                onChange={(e) => handleInputChange('widget_title', e.target.value)}
                placeholder="Share your feedback with us!"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="widget_color">Widget Color</Label>
              <div className="flex items-center space-x-3">
                <Input
                  id="widget_color"
                  type="color"
                  value={formData.widget_color}
                  onChange={(e) => handleInputChange('widget_color', e.target.value)}
                  className="w-20 h-10 p-1 border rounded"
                />
                <Input
                  value={formData.widget_color}
                  onChange={(e) => handleInputChange('widget_color', e.target.value)}
                  placeholder="#3B82F6"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="greeting_text">Greeting Text</Label>
              <Textarea
                id="greeting_text"
                value={formData.greeting_text}
                onChange={(e) => handleInputChange('greeting_text', e.target.value)}
                placeholder="Welcome, tell us what's on your mind"
                rows={3}
              />
            </div>

            <div className="pt-4">
              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {settings && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
                <CardDescription>
                  Your unique project identifier for the feedback widget
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Project ID</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={settings.project_id}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(settings.project_id)
                        toast({
                          title: 'Copied',
                          description: 'Project ID copied to clipboard'
                        })
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use this Project ID in your widget embed code
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Widget Embed Code</CardTitle>
                <CardDescription>
                  Copy and paste this code into your website to display the feedback widget
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                      <code className="text-sm">
                        {`<script src="https://notex.com.ng/widget.js" data-project-id="${settings.project_id}"></script>`}
                      </code>
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyEmbedCode}
                      className="absolute top-2 right-2"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Code
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p><strong>Installation Instructions:</strong></p>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                      <li>Copy the embed code above</li>
                      <li>Paste it before the closing <code>&lt;/body&gt;</code> tag of your website</li>
                      <li>The feedback widget will appear on your website</li>
                      <li>Feedback will be collected and displayed in this dashboard</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

export default FeedbackSettings