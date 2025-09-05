import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { QrCode, Copy, Check, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface QRCodeFeedbackSectionProps {
  projectId: string;
}

export default function QRCodeFeedbackSection({ projectId }: QRCodeFeedbackSectionProps) {
  const [qrLink, setQrLink] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load existing QR link when component mounts
  useEffect(() => {
    const loadExistingLink = async () => {
      if (!projectId) return;

      try {
        console.log('Loading existing QR link for project:', projectId);
        const { data: existingLink, error } = await supabase
          .from('qr_links')
          .select('link')
          .eq('project_id', projectId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.warn('Error loading existing QR link:', error);
        } else if (!error && existingLink) {
          console.log('Loaded existing QR link:', existingLink.link);
          setQrLink(existingLink.link);
          generateQRCode(existingLink.link);
        } else {
          console.log('No existing QR link found for project:', projectId);
        }
      } catch (error) {
        console.warn('Unexpected error loading existing QR link:', error);
      }
    };

    loadExistingLink();
  }, [projectId]);

  const generateQRCode = (url: string) => {
    // Simple QR code generation using a free service
    // In production, you might want to use a proper QR code library
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    setQrCodeDataUrl(qrCodeUrl);
  };

  const generateQRLink = async () => {
    if (!projectId) {
      toast.error('Project ID is required to generate QR link');
      return;
    }

    setLoading(true);
    try {
      console.log('Generating QR link for project:', projectId);

      // Check if link already exists for this project
      const { data: existingLink, error: fetchError } = await supabase
        .from('qr_links')
        .select('link')
        .eq('project_id', projectId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing QR link:', fetchError);
        throw new Error(`Failed to check existing links: ${fetchError.message}`);
      }

      // If link already exists, use it
      if (existingLink) {
        console.log('Found existing QR link:', existingLink.link);
        setQrLink(existingLink.link);
        generateQRCode(existingLink.link);
        toast.success('QR link loaded successfully!');
        return;
      }

      // Generate new QR link using current domain
      const baseUrl = window.location.origin;
      const qrLinkUrl = `${baseUrl}/feedback/qr/${projectId}`;
      console.log('Generated new QR link:', qrLinkUrl);

      // Insert new link into database
      const { data: newLink, error: insertError } = await supabase
        .from('qr_links')
        .insert({
          project_id: projectId,
          link: qrLinkUrl
        })
        .select('link')
        .single();

      if (insertError) {
        console.error('Error inserting QR link:', insertError);
        throw new Error(`Failed to create QR link: ${insertError.message}`);
      }

      console.log('Successfully created QR link:', newLink.link);
      setQrLink(newLink.link);
      generateQRCode(newLink.link);
      toast.success('QR link generated successfully!');
    } catch (error) {
      console.error('Error generating QR link:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to generate QR link: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('QR link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `notex-qr-feedback-${projectId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded!');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2">
            <QrCode className="h-5 w-5 text-blue-600" />
            <span>QR Code Feedback</span>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Channel: QR Code
          </Badge>
        </CardTitle>
        <CardDescription>
          Allow customers to leave feedback by scanning a QR code. Works offline or online — perfect for stores, events, and restaurants. Feedback is linked to your project and analyzed by NoteX AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {qrLink ? (
          <>
            <div className="space-y-4">
              <Label htmlFor="qr-link">QR Code Feedback Link</Label>
              <div className="flex space-x-2">
                <Input
                  id="qr-link"
                  readOnly
                  value={qrLink}
                  className="flex-grow bg-gray-50 border-gray-200"
                />
                <Button onClick={() => copyToClipboard(qrLink)} disabled={copied}>
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            {qrCodeDataUrl && (
              <div className="space-y-4">
                <Label>QR Code Preview</Label>
                <div className="flex flex-col items-center space-y-4 p-4 border rounded-lg bg-gray-50">
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code for feedback"
                    className="w-48 h-48 border rounded"
                  />
                  <Button onClick={downloadQRCode} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>
                </div>
              </div>
            )}

            <Button
              onClick={generateQRLink}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate QR Link
            </Button>
          </>
        ) : (
          <Button onClick={generateQRLink} disabled={loading} className="w-full">
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <QrCode className="h-4 w-4 mr-2" />
            )}
            Generate QR Code
          </Button>
        )}
        
        <p className="text-sm text-gray-500 mt-2">
          Print this QR code on posters, menus, or business cards. When customers scan it, they'll be taken directly to your feedback form.
        </p>
      </CardContent>
    </Card>
  );
}