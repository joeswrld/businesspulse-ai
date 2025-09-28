import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, RefreshCw, ExternalLink, Code, QrCode } from 'lucide-react';
import { useFeedbackSettings } from '@/hooks/useFeedbackSettings';
import { useToast } from '@/hooks/use-toast';

const FeedbackSettings: React.FC = () => {
  const { settings, loading, saving, saveSettings, regenerateUrls, setSettings } = useFeedbackSettings();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast({
        title: "Copied!",
        description: `${fieldName} copied to clipboard.`,
        variant: "default",
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRegenerateUrls = async () => {
    try {
      await regenerateUrls();
      toast({
        title: "URLs Regenerated!",
        description: "New project ID and URLs have been generated.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Regeneration Failed",
        description: "Failed to regenerate URLs. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    
    try {
      await saveSettings(settings);
      toast({
        title: "Settings Saved!",
        description: "Your feedback settings have been updated.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Settings will always exist due to RPC function - no "not found" state
  if (!settings) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">Initializing your feedback settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feedback Settings</h1>
          <p className="text-gray-600 mt-2">Configure your feedback collection settings and generate embed codes.</p>
        </div>
        <Button onClick={handleRegenerateUrls} variant="outline" disabled={saving}>
          <RefreshCw className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
          Regenerate URLs
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Project ID Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Project Configuration
            </CardTitle>
            <CardDescription>
              Your unique project identifier for feedback collection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-id">Project ID</Label>
              <div className="flex gap-2">
                <Input
                  id="project-id"
                  value={settings.project_id}
                  readOnly
                  className="bg-gray-50 font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(settings.project_id, 'Project ID')}
                >
                  {copiedField === 'Project ID' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Survey Links Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Survey & Feedback Links
            </CardTitle>
            <CardDescription>
              Share these links with your customers to collect feedback and satisfaction surveys.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Satisfaction Survey */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="survey-url">Customer Satisfaction Survey</Label>
                <div className="flex gap-2">
                  <Input
                    id="survey-url"
                    value={settings.customer_survey_url}
                    onChange={(e) => setSettings({...settings, customer_survey_url: e.target.value})}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(settings.customer_survey_url, 'Survey URL')}
                  >
                    {copiedField === 'Survey URL' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(settings.customer_survey_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">QR Code:</div>
                <div className="p-2 bg-white border rounded">
                  <QRCodeSVG value={settings.customer_survey_url} size={80} />
                </div>
              </div>
            </div>

            {/* Product Feedback Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feedback-url">Product Feedback Form</Label>
                <div className="flex gap-2">
                  <Input
                    id="feedback-url"
                    value={settings.product_feedback_url}
                    onChange={(e) => setSettings({...settings, product_feedback_url: e.target.value})}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(settings.product_feedback_url, 'Feedback URL')}
                  >
                    {copiedField === 'Feedback URL' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(settings.product_feedback_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">QR Code:</div>
                <div className="p-2 bg-white border rounded">
                  <QRCodeSVG value={settings.product_feedback_url} size={80} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Widget Embed Code Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Feedback Widget
            </CardTitle>
            <CardDescription>
              Embed this code on your website to show a feedback widget to your visitors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="widget-code">Embed Code</Label>
              <div className="space-y-2">
                <Textarea
                  id="widget-code"
                  value={settings.widget_code}
                  onChange={(e) => setSettings({...settings, widget_code: e.target.value})}
                  rows={3}
                  className="font-mono text-sm"
                />
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(settings.widget_code, 'Widget Code')}
                  >
                    {copiedField === 'Widget Code' ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
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
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">How to use:</h4>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Copy the embed code above</li>
                <li>Paste it into your website's HTML before the closing &lt;/body&gt; tag</li>
                <li>The feedback widget will automatically appear on your pages</li>
                <li>Visitors can click the widget to submit feedback</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSaveSettings} 
            disabled={saving}
            size="lg"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackSettings;
