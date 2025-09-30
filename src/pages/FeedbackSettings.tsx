import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  Code, 
  QrCode, 
  Download,
  Settings,
  Link as LinkIcon,
  Sparkles,
  Eye,
  Palette
} from 'lucide-react';
import { useFeedbackSettings } from '@/hooks/useFeedbackSettings';
import { useToast } from '@/hooks/use-toast';

const FeedbackSettings: React.FC = () => {
  const { settings, loading, saving, saveSettings, regenerateUrls, setSettings } = useFeedbackSettings();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();
  const csatQrRef = useRef<HTMLDivElement>(null);
  const productQrRef = useRef<HTMLDivElement>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast({
        title: "Copied!",
        description: `${fieldName} copied to clipboard.`,
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

  const downloadQRCode = (qrRef: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 400;
    canvas.height = 400;

    img.onload = () => {
      if (ctx) {
        // White background for better visibility
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 400, 400);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.png`;
            a.click();
            URL.revokeObjectURL(url);
            
            toast({
              title: "QR Code Downloaded!",
              description: `${filename} has been saved to your device.`,
            });
          }
        });
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleRegenerateUrls = async () => {
    try {
      await regenerateUrls();
      toast({
        title: "URLs Regenerated!",
        description: "New project ID and URLs have been generated.",
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
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading || !settings) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading feedback settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Feedback Settings</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Configure your feedback collection and share links with customers
          </p>
        </div>
        <Button 
          onClick={handleSaveSettings} 
          disabled={saving}
          size="lg"
          className="w-full sm:w-auto"
        >
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="links" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="links" className="gap-2">
            <LinkIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Survey Links</span>
            <span className="sm:hidden">Links</span>
          </TabsTrigger>
          <TabsTrigger value="widget" className="gap-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">Widget Code</span>
            <span className="sm:hidden">Widget</span>
          </TabsTrigger>
          <TabsTrigger value="project" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Project ID</span>
            <span className="sm:hidden">Project</span>
          </TabsTrigger>
        </TabsList>

        {/* Survey Links Tab */}
        <TabsContent value="links" className="space-y-6">
          {/* Customer Satisfaction Survey */}
          <Card className="border-2 border-primary/20 dark:border-primary/30">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Customer Satisfaction Survey
                </CardTitle>
                <Badge variant="secondary">CSAT</Badge>
              </div>
              <CardDescription className="text-sm">
                Simple rating-based survey to measure customer satisfaction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* URL Input */}
              <div className="space-y-3">
                <Label htmlFor="survey-url" className="text-sm font-medium">
                  Survey URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="survey-url"
                    value={settings.customer_survey_url}
                    onChange={(e) => setSettings({...settings, customer_survey_url: e.target.value})}
                    className="flex-1 font-mono text-xs sm:text-sm bg-muted/50"
                    readOnly
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(settings.customer_survey_url, 'Survey URL')}
                    className="flex-shrink-0"
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
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* QR Code */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">QR Code</Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div 
                    ref={csatQrRef}
                    className="p-4 bg-white dark:bg-gray-900 border-2 rounded-xl shadow-sm"
                  >
                    <QRCodeSVG 
                      value={settings.customer_survey_url} 
                      size={120}
                      level="H"
                      includeMargin
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Share this QR code in emails, print materials, or display it in your physical location
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadQRCode(csatQrRef, 'csat-survey-qr-code')}
                      className="w-full sm:w-auto"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download QR Code
                    </Button>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-muted/50 p-4 rounded-lg border">
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-primary mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">Preview</h4>
                    <p className="text-xs text-muted-foreground">
                      Customers will rate their satisfaction on a 1-5 scale and optionally provide comments
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Feedback Form */}
          <Card className="border-2 border-green-500/20 dark:border-green-500/30">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <QrCode className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  Product Feedback Form
                </CardTitle>
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Feedback
                </Badge>
              </div>
              <CardDescription className="text-sm">
                Detailed form for bug reports, feature requests, and general feedback
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* URL Input */}
              <div className="space-y-3">
                <Label htmlFor="feedback-url" className="text-sm font-medium">
                  Feedback URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="feedback-url"
                    value={settings.product_feedback_url}
                    onChange={(e) => setSettings({...settings, product_feedback_url: e.target.value})}
                    className="flex-1 font-mono text-xs sm:text-sm bg-muted/50"
                    readOnly
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(settings.product_feedback_url, 'Feedback URL')}
                    className="flex-shrink-0"
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
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* QR Code */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">QR Code</Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div 
                    ref={productQrRef}
                    className="p-4 bg-white dark:bg-gray-900 border-2 rounded-xl shadow-sm"
                  >
                    <QRCodeSVG 
                      value={settings.product_feedback_url} 
                      size={120}
                      level="H"
                      includeMargin
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Perfect for product packaging, user manuals, or support documentation
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadQRCode(productQrRef, 'product-feedback-qr-code')}
                      className="w-full sm:w-auto"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download QR Code
                    </Button>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-muted/50 p-4 rounded-lg border">
                <div className="flex items-start gap-3">
                  <Eye className="h-5 w-5 text-primary mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">Preview</h4>
                    <p className="text-xs text-muted-foreground">
                      Customers can submit detailed feedback with type categorization and priority levels
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Widget Code Tab */}
        <TabsContent value="widget" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Code className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                Feedback Widget Embed Code
              </CardTitle>
              <CardDescription>
                Add this code to your website to display an interactive feedback widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="widget-code" className="text-sm font-medium">
                  Embed Code
                </Label>
                <Textarea
                  id="widget-code"
                  value={settings.widget_code}
                  onChange={(e) => setSettings({...settings, widget_code: e.target.value})}
                  rows={5}
                  className="font-mono text-xs sm:text-sm bg-muted/50"
                  readOnly
                />
                <div className="flex justify-end">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => copyToClipboard(settings.widget_code, 'Widget Code')}
                  >
                    {copiedField === 'Widget Code' ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-white" />
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

              <Separator />

              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <Sparkles className="h-4 w-4" />
                  Installation Instructions
                </h4>
                <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200 ml-1">
                  <li className="flex gap-2">
                    <span className="font-semibold min-w-[1.5rem]">1.</span>
                    <span>Copy the embed code above</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold min-w-[1.5rem]">2.</span>
                    <span>Open your website's HTML file</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold min-w-[1.5rem]">3.</span>
                    <span>Paste the code before the closing <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded text-xs">&lt;/body&gt;</code> tag</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold min-w-[1.5rem]">4.</span>
                    <span>Save and refresh your website to see the widget</span>
                  </li>
                </ol>
              </div>

              {/* Features */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-sm">Easy Integration</h5>
                    <p className="text-xs text-muted-foreground">One-line installation</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-sm">Customizable</h5>
                    <p className="text-xs text-muted-foreground">Matches your brand</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-sm">Mobile Friendly</h5>
                    <p className="text-xs text-muted-foreground">Works on all devices</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-sm">Real-time</h5>
                    <p className="text-xs text-muted-foreground">Instant data collection</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project ID Tab */}
        <TabsContent value="project" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                Project Configuration
              </CardTitle>
              <CardDescription>
                Your unique project identifier for all feedback collection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="project-id" className="text-sm font-medium">
                  Project ID
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="project-id"
                    value={settings.project_id}
                    readOnly
                    className="flex-1 font-mono text-xs sm:text-sm bg-muted/50"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(settings.project_id, 'Project ID')}
                    className="flex-shrink-0"
                  >
                    {copiedField === 'Project ID' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                      Regenerate URLs
                    </h4>
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      This will generate new URLs and invalidate all existing links. Use this if your current links have been compromised or shared publicly by mistake.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateUrls}
                      className="border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate All URLs
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeedbackSettings;
