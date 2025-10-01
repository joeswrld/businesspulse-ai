// src/pages/FeedbackSettings.tsx
// This file has been fixed to properly save logo_url and business_name to the database

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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  Palette,
  Upload,
  X,
  Building2
} from 'lucide-react';
import { useFeedbackSettings } from '@/hooks/useFeedbackSettings';
import { useToast } from '@/hooks/use-toast';

const FeedbackSettings: React.FC = () => {
  const { user } = useAuth();
  const { settings, loading, saving, saveSettings, regenerateUrls, setSettings } = useFeedbackSettings();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const { toast } = useToast();
  const csatQrRef = useRef<HTMLDivElement>(null);
  const productQrRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (PNG, JPG, SVG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingLogo(true);

    try {
      console.log('📤 Uploading logo...', file.name);

      // Delete old logo if exists
      if (settings?.logo_url) {
        try {
          const urlParts = settings.logo_url.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const oldPath = `${user.id}/${fileName}`;
          
          await supabase.storage
            .from('feedback-logos')
            .remove([oldPath]);
          
          console.log('🗑️ Old logo deleted:', oldPath);
        } catch (deleteError) {
          console.warn('⚠️ Could not delete old logo:', deleteError);
        }
      }

      // Upload new logo
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('feedback-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('feedback-logos')
        .getPublicUrl(filePath);

      console.log('✅ Logo uploaded:', publicUrl);

      // Update settings in state
      const updatedSettings = { ...settings!, logo_url: publicUrl };
      setSettings(updatedSettings);

      // ✅ CRITICAL FIX: Save to database immediately
      await saveSettings(updatedSettings);

      toast({
        title: "Logo Uploaded!",
        description: "Your logo has been uploaded and saved successfully.",
      });
    } catch (error) {
      console.error('❌ Failed to upload logo:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!settings?.logo_url || !user) return;

    try {
      console.log('🗑️ Removing logo...');

      try {
        const urlParts = settings.logo_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const oldPath = `${user.id}/${fileName}`;
        
        await supabase.storage
          .from('feedback-logos')
          .remove([oldPath]);
        
        console.log('🗑️ Logo file deleted from storage');
      } catch (deleteError) {
        console.warn('⚠️ Could not delete logo file:', deleteError);
      }

      const updatedSettings = { ...settings, logo_url: null };
      setSettings(updatedSettings);

      // ✅ CRITICAL FIX: Save to database immediately
      await saveSettings(updatedSettings);

      toast({
        title: "Logo Removed",
        description: "Your logo has been removed and saved.",
      });
    } catch (error) {
      console.error('❌ Failed to remove logo:', error);
      toast({
        title: "Removal Failed",
        description: "Failed to remove logo. Please try again.",
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

        {/* Branding Tab */}
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
              {/* Business Name */}
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

              {/* Logo Upload */}
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
                      <div className="flex
