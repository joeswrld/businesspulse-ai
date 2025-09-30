import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, RefreshCw, ExternalLink, Code, QrCode, Settings, Link2, Smartphone, Globe, Shield, Sparkles, MessageSquare } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Settings className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Feedback Settings
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Configure your feedback collection settings and generate embed codes for seamless integration
          </p>
        </div>

        <div className="grid gap-8 max-w-4xl mx-auto">
          {/* Project Configuration Card */}
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-t-lg">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Code className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <span>Project Configuration</span>
                  <Badge variant="outline" className="ml-3 bg-blue-100 text-blue-700 border-blue-200">
                    <Shield className="h-3 w-3 mr-1" />
                    Secure
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription className="text-base">
                Your unique project identifier for secure feedback collection
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <Label htmlFor="project-id" className="text-sm font-semibold text-muted-foreground">
                  Project ID
                </Label>
                <div className="flex gap-3">
                  <Input
                    id="project-id"
                    value={settings.project_id}
                    readOnly
                    className="bg-muted/50 font-mono text-sm border-2 focus:border-blue-500 transition-colors"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(settings.project_id, 'Project ID')}
                    className="border-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                  >
                    {copiedField === 'Project ID' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This ID is used to securely associate feedback with your project
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Survey & Feedback Links Card */}
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-t-lg">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Link2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <span>Survey & Feedback Links</span>
                  <Badge variant="outline" className="ml-3 bg-green-100 text-green-700 border-green-200">
                    <Globe className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription className="text-base">
                Share these links with your customers to collect feedback and satisfaction surveys
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {/* Customer Satisfaction Survey */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Customer Satisfaction Survey</h3>
                    <p className="text-sm text-muted-foreground">Collect customer satisfaction ratings and feedback</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label htmlFor="survey-url" className="text-sm font-semibold text-muted-foreground">
                    Survey URL
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      id="survey-url"
                      value={settings.customer_survey_url}
                      onChange={(e) => setSettings({...settings, customer_survey_url: e.target.value})}
                      className="flex-1 border-2 focus:border-green-500 transition-colors"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(settings.customer_survey_url, 'Survey URL')}
                      className="border-2 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
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
                      className="border-2 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-6 p-4 bg-muted/30 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">QR Code:</div>
                  <div className="p-3 bg-white dark:bg-slate-700 border-2 border-muted rounded-lg shadow-sm">
                    <QRCodeSVG value={settings.customer_survey_url} size={100} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Scan with any QR code reader
                  </div>
                </div>
              </div>

              <Separator className="my-8" />

              {/* Product Feedback Form */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Product Feedback Form</h3>
                    <p className="text-sm text-muted-foreground">Collect detailed product feedback and suggestions</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label htmlFor="feedback-url" className="text-sm font-semibold text-muted-foreground">
                    Feedback URL
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      id="feedback-url"
                      value={settings.product_feedback_url}
                      onChange={(e) => setSettings({...settings, product_feedback_url: e.target.value})}
                      className="flex-1 border-2 focus:border-purple-500 transition-colors"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(settings.product_feedback_url, 'Feedback URL')}
                      className="border-2 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
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
                      className="border-2 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center space-x-6 p-4 bg-muted/30 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">QR Code:</div>
                  <div className="p-3 bg-white dark:bg-slate-700 border-2 border-muted rounded-lg shadow-sm">
                    <QRCodeSVG value={settings.product_feedback_url} size={100} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Scan with any QR code reader
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Widget Embed Code Card */}
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-t-lg">
              <CardTitle className="flex items-center space-x-3 text-xl">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <QrCode className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <span>Feedback Widget</span>
                  <Badge variant="outline" className="ml-3 bg-orange-100 text-orange-700 border-orange-200">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Embed
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription className="text-base">
                Embed this code on your website to show a feedback widget to your visitors
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <Label htmlFor="widget-code" className="text-sm font-semibold text-muted-foreground">
                  Embed Code
                </Label>
                <div className="space-y-4">
                  <Textarea
                    id="widget-code"
                    value={settings.widget_code}
                    onChange={(e) => setSettings({...settings, widget_code: e.target.value})}
                    rows={4}
                    className="font-mono text-sm border-2 focus:border-orange-500 transition-colors bg-muted/30"
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(settings.widget_code, 'Widget Code')}
                      className="border-2 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
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
              
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
                <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-4 flex items-center space-x-2">
                  <Sparkles className="h-5 w-5" />
                  <span>How to use:</span>
                </h4>
                <ol className="text-sm text-orange-800 dark:text-orange-200 space-y-2 list-decimal list-inside">
                  <li>Copy the embed code above</li>
                  <li>Paste it into your website's HTML before the closing <code className="bg-orange-100 dark:bg-orange-900/30 px-1 rounded">&lt;/body&gt;</code> tag</li>
                  <li>The feedback widget will automatically appear on your pages</li>
                  <li>Visitors can click the widget to submit feedback</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-center pt-4">
            <Button 
              onClick={handleSaveSettings} 
              disabled={saving}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                  Saving Settings...
                </>
              ) : (
                <>
                  <Settings className="h-5 w-5 mr-3" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackSettings;
