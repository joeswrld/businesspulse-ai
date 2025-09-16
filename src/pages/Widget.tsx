import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Copy, Code, Eye, ExternalLink, Widget } from 'lucide-react'

interface FeedbackSettings {
  id: string
  user_id: string
  project_id: string
  widget_title: string | null
  widget_color: string | null
  greeting_text: string | null
  created_at: string
}

const Widget: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [settings, setSettings] = useState<FeedbackSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadSettings()
    }
  }, [user?.id])

  const loadSettings = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .rpc('get_or_create_feedback_settings', { p_user_id: user?.id! })
      
      if (error) {
        console.error('Error loading settings:', error)
        return
      }

      if (data && data.length > 0) {
        setSettings(data[0])
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyEmbedCode = () => {
    if (!settings) return

    const embedCode = `<script src="https://notex.com.ng/widget.js" data-project-id="${settings.project_id}"></script>`
    
    navigator.clipboard.writeText(embedCode)
    toast({
      title: 'Copied',
      description: 'Embed code copied to clipboard!'
    })
  }

  const copyProjectId = () => {
    if (!settings) return

    navigator.clipboard.writeText(settings.project_id)
    toast({
      title: 'Copied',
      description: 'Project ID copied to clipboard!'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading widget settings...</p>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Widget className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No widget settings found</h3>
          <p className="text-muted-foreground">
            Please configure your feedback settings first
          </p>
        </div>
      </div>
    )
  }

  const embedCode = `<script src="https://notex.com.ng/widget.js" data-project-id="${settings.project_id}"></script>`

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Widget className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">Widget</h1>
          <p className="text-muted-foreground">
            Preview your feedback widget and get the embed code
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Embed Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Code className="h-5 w-5" />
              <span>Embed Code</span>
            </CardTitle>
            <CardDescription>
              Copy this code and paste it into your website's HTML
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Project ID</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyProjectId}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                {settings.project_id}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Embed Script</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyEmbedCode}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <div className="bg-muted p-3 rounded-lg font-mono text-sm break-all">
                {embedCode}
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Implementation Steps:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Copy the embed script above</li>
                <li>Paste it before the closing <code>&lt;/body&gt;</code> tag</li>
                <li>Save and publish your website</li>
                <li>The feedback widget will appear on your site</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Live Preview</span>
            </CardTitle>
            <CardDescription>
              See how your feedback widget will look to users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Button
                  variant={showPreview ? "default" : "outline"}
                  onClick={() => setShowPreview(!showPreview)}
                  size="sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? 'Hide' : 'Show'} Preview
                </Button>
                <Badge variant="outline">
                  {settings.widget_color}
                </Badge>
              </div>

              {showPreview && (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 bg-muted/20">
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="font-semibold text-lg mb-2">
                        {settings.widget_title || 'Share your feedback with us!'}
                      </h3>
                      <p className="text-muted-foreground">
                        {settings.greeting_text || 'Welcome, tell us what\'s on your mind'}
                      </p>
                    </div>
                    
                    {/* Simulated Widget Button */}
                    <div className="flex justify-center">
                      <div
                        className="px-6 py-3 rounded-full text-white font-medium cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: settings.widget_color || '#3B82F6' }}
                      >
                        💬 Feedback
                      </div>
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                      <p>This is how your floating feedback button will appear</p>
                      <p className="text-xs mt-1">
                        Clicking it will open a feedback form
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Widget Features:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Floating button with your custom color</li>
                  <li>• Customizable title and greeting text</li>
                  <li>• Optional email collection</li>
                  <li>• Mobile-responsive design</li>
                  <li>• Easy to integrate</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Widget Configuration</CardTitle>
          <CardDescription>
            Current settings for your feedback widget
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Widget Title</label>
              <p className="text-sm mt-1">{settings.widget_title || 'Share your feedback with us!'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Widget Color</label>
              <div className="flex items-center space-x-2 mt-1">
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: settings.widget_color || '#3B82F6' }}
                />
                <span className="text-sm font-mono">{settings.widget_color || '#3B82F6'}</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Greeting Text</label>
              <p className="text-sm mt-1 line-clamp-2">
                {settings.greeting_text || 'Welcome, tell us what\'s on your mind'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Widget