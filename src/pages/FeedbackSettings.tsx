// src/pages/FeedbackSettings.tsx
// Fixed version with on-demand QR code generation

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFeedbackSettings } from '@/hooks/useFeedbackSettings';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button, Input, Label, Textarea, Tabs, TabsContent, TabsList, TabsTrigger,
  Badge, Separator, Alert, AlertDescription
} from '@/components/ui';

import { 
  Copy, Check, RefreshCw, ExternalLink, Code, QrCode, Download,
  Settings, Link as LinkIcon, Sparkles, Eye, Palette, Upload, X,
  Building2, Lock, Crown, Loader2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const FeedbackSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings, loading, saving, saveSettings, regenerateUrls, setSettings } = useFeedbackSettings();

  // Subscription hook
  const { hasAccess, isLoading: loadingSubscription, isTrialExpired, 
          isSubscriptionExpired, daysLeft, status } = useSubscriptionStatus({
    redirectOnExpiry: true,
    allowBillingPage: false
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showCsatQr, setShowCsatQr] = useState(false);
  const [showProductQr, setShowProductQr] = useState(false);
  const { toast } = useToast();
  const csatQrRef = useRef<HTMLDivElement>(null);
  const productQrRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
   
  // Loading Subscription Check
  // -----------------------
  if (loadingSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

   // Paywall Check
  // -----------------------
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-red-950 p-4">
        <Card className="w-full max-w-md shadow-2xl border-2 border-red-200 dark:border-red-800">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">Feedback Settings Access Locked</CardTitle>
            <p className="text-muted-foreground">
              {isTrialExpired 
                  ? 'Your trial has expired. Upgrade to access feedback settings.'
                  : isSubscriptionExpired
                  ? 'Your subscription has expired. Renew to continue.'
                  : 'Active subscription required to access feedback settings.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => navigate('/billing')}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              size="lg"
            >
              <Crown className="h-5 w-5 mr-2" />
              {isSubscriptionExpired ? 'Renew Subscription' : 'Upgrade Now'}
            </Button>
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  
  

  // -----------------------
  // Copy helper
  // -----------------------
  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast({ title: "Copied!", description: `${fieldName} copied to clipboard.` });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast({ title: "Copy Failed", description: "Failed to copy to clipboard.", variant: "destructive" });
    }
  };

  // -----------------------
  // Logo Upload / Remove
  // -----------------------
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid File", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Image must be smaller than 2MB", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);

    try {
      // Remove old logo
      if (settings?.logo_url) {
        const urlParts = settings.logo_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        await supabase.storage.from('feedback-logos').remove([`${user.id}/${fileName}`]);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('feedback-logos').upload(filePath, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('feedback-logos').getPublicUrl(filePath);

      const updatedSettings = { ...settings!, logo_url: publicUrl };
      setSettings(updatedSettings);
      await saveSettings(updatedSettings);

      toast({ title: "Logo Uploaded!", description: "Your logo has been uploaded successfully." });
    } catch (error) {
      toast({ title: "Upload Failed", description: "Failed to upload logo.", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!settings?.logo_url || !user) return;

    try {
      const urlParts = settings.logo_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      await supabase.storage.from('feedback-logos').remove([`${user.id}/${fileName}`]);

      const updatedSettings = { ...settings, logo_url: null };
      setSettings(updatedSettings);
      await saveSettings(updatedSettings);

      toast({ title: "Logo Removed", description: "Your logo has been removed." });
    } catch (error) {
      toast({ title: "Removal Failed", description: "Failed to remove logo.", variant: "destructive" });
    }
  };

  // -----------------------
  // Save Settings with Access Block
  // -----------------------
  const handleSaveSettings = async () => {
    if (!settings || !hasAccess) {
      toast({ title: "Access Required", description: "Upgrade to modify settings", variant: "destructive" });
      navigate('/billing');
      return;
    }
    try {
      await saveSettings(settings);
      toast({ title: "Settings Saved!", description: "Your feedback settings have been updated." });
    } catch {
      toast({ title: "Save Failed", description: "Failed to save settings.", variant: "destructive" });
    }
  };

  // -----------------------
  // QR download helper
  // -----------------------
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
      if (!ctx) return;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, 400, 400);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "QR Code Downloaded!", description: `${filename} saved.` });
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleRegenerateUrls = async () => {
    if (!settings) return;
    try {
      await regenerateUrls();
      toast({ title: "URLs Regenerated", description: "All feedback links have been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to regenerate URLs.", variant: "destructive" });
    }
  };
  

  // -----------------------
  // Loading Feedback Settings
  // -----------------------
  if (loading || !settings) {
    return (
      <div className=" mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading feedback settings...</p>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------
  // Main UI
  // -----------------------
  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-7xl">
      {!hasAccess && (
        <Alert className="border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
          <Lock className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-900 dark:text-red-100">
            Your widgets are disabled. Upgrade to reactivate feedback collection.
          </AlertDescription>
        </Alert>
      )}

  return (
    <div className=" mx-auto p-4 sm:p-6 space-y-6 max-w-7xl">
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

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="branding" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
            <span className="sm:hidden">Brand</span>
          </TabsTrigger>
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

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                Brand Customization
              </CardTitle>
              <CardDescription>
                Customize how your feedback forms look with your logo and business name
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="business-name" className="text-sm font-medium">
                  Business Name
                </Label>
                <Input
                  id="business-name"
                  placeholder="Enter your business name"
                  value={settings.business_name || ''}
                  onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                  className="max-w-md"
                />
                <p className="text-xs text-muted-foreground">
                  This will be displayed at the top of your feedback forms
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Business Logo</Label>
                
                {settings.logo_url ? (
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="relative group">
                      <img
                        src={settings.logo_url}
                        alt="Business Logo"
                        className="h-24 w-24 object-contain border-2 rounded-lg bg-white dark:bg-gray-900 p-2"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={handleRemoveLogo}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Your logo is uploaded and will appear on all feedback forms
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingLogo}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Replace Logo
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveLogo}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-muted rounded-full">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Upload your business logo</p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, SVG up to 2MB
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo}
                      >
                        {uploadingLogo ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Preview</Label>
                <div className="border rounded-lg p-6 bg-muted/30">
                  <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                    {settings.logo_url && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
                        <img
                          src={settings.logo_url}
                          alt="Logo Preview"
                          className="h-16 w-auto object-contain max-w-[200px]"
                        />
                      </div>
                    )}
                    {settings.business_name && (
                      <h3 className="text-2xl font-bold text-center">
                        {settings.business_name}
                      </h3>
                    )}
                    {!settings.logo_url && !settings.business_name && (
                      <p className="text-sm text-muted-foreground text-center">
                        Add your logo and business name to see a preview
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  This is how your branding will appear on feedback forms
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                      Branding Tips
                    </h4>
                    <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 ml-1">
                      <li>Use a square or horizontal logo for best results</li>
                      <li>Transparent PNG files work best for logos</li>
                      <li>Keep your business name concise (2-4 words)</li>
                      <li>Changes apply to both CSAT and Product Feedback forms</li>
                      <li>Click Save Settings after making changes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="space-y-6">
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
              <div className="space-y-3">
                <Label htmlFor="survey-url" className="text-sm font-medium">
                  Survey URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="survey-url"
                    value={settings.customer_survey_url}
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

              <div className="space-y-3">
                <Label className="text-sm font-medium">QR Code</Label>
                {showCsatQr ? (
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
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadQRCode(csatQrRef, 'csat-survey-qr-code')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCsatQr(false)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Hide
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <QrCode className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium mb-2">Generate QR Code</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Create a scannable QR code for your survey link
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCsatQr(true)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate QR Code
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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
              <div className="space-y-3">
                <Label htmlFor="feedback-url" className="text-sm font-medium">
                  Feedback URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="feedback-url"
                    value={settings.product_feedback_url}
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

              <div className="space-y-3">
                <Label className="text-sm font-medium">QR Code</Label>
                {showProductQr ? (
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
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadQRCode(productQrRef, 'product-feedback-qr-code')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowProductQr(false)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Hide
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <QrCode className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium mb-2">Generate QR Code</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Create a scannable QR code for your feedback link
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowProductQr(true)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate QR Code
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
                    <span>Open your website HTML file</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold min-w-[1.5rem]">3.</span>
                    <span>Paste the code before the closing body tag</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold min-w-[1.5rem]">4.</span>
                    <span>Save and refresh your website to see the widget</span>
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
