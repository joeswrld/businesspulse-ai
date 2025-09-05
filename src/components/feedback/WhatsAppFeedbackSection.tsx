import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface WhatsAppFeedbackSectionProps {
  projectId: string;
}

export default function WhatsAppFeedbackSection({ projectId }: WhatsAppFeedbackSectionProps) {
  const [whatsappLink, setWhatsappLink] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load existing WhatsApp link when component mounts
  useEffect(() => {
    const loadExistingLink = async () => {
      if (!projectId) return;

      try {
        console.log('Loading existing WhatsApp link for project:', projectId);
        const { data: existingLink, error } = await supabase
          .from('whatsapp_links')
          .select('link')
          .eq('project_id', projectId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.warn('Error loading existing WhatsApp link:', error);
          console.warn('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
        } else if (!error && existingLink) {
          console.log('Loaded existing WhatsApp link:', existingLink.link);
          setWhatsappLink(existingLink.link);
        } else {
          console.log('No existing WhatsApp link found for project:', projectId);
        }
      } catch (error) {
        console.warn('Unexpected error loading existing WhatsApp link:', error);
        // Don't show error to user, just log it
      }
    };

    loadExistingLink();
  }, [projectId]);

  const generateWhatsAppLink = async () => {
    if (!projectId) {
      toast.error('Project ID is required to generate WhatsApp link');
      return;
    }

    setLoading(true);
    try {
      console.log('Generating WhatsApp link for project:', projectId);

      // Check if link already exists for this project
      const { data: existingLink, error: fetchError } = await supabase
        .from('whatsapp_links')
        .select('link')
        .eq('project_id', projectId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing WhatsApp link:', fetchError);
        console.error('Error details:', {
          code: fetchError.code,
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint
        });
        throw new Error(`Failed to check existing links: ${fetchError.message}`);
      }

      // If link already exists, use it
      if (existingLink) {
        console.log('Found existing WhatsApp link:', existingLink.link);
        setWhatsappLink(existingLink.link);
        toast.success('WhatsApp link loaded successfully!');
        return;
      }

      // Generate new WhatsApp link
      const whatsappLink = `https://notex.com.ng/wa-feedback/${projectId}`;
      console.log('Generated new WhatsApp link:', whatsappLink);

      // Insert new link into database
      const { data: newLink, error: insertError } = await supabase
        .from('whatsapp_links')
        .insert({
          project_id: projectId,
          link: whatsappLink
        })
        .select('link')
        .single();

      if (insertError) {
        console.error('Error inserting WhatsApp link:', insertError);
        console.error('Insert error details:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        });
        throw new Error(`Failed to create WhatsApp link: ${insertError.message}`);
      }

      console.log('Successfully created WhatsApp link:', newLink.link);
      setWhatsappLink(newLink.link);
      toast.success('WhatsApp link generated successfully!');
    } catch (error) {
      console.error('Error generating WhatsApp link:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to generate WhatsApp link: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <CardTitle>WhatsApp Feedback</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Channel: WhatsApp
          </Badge>
        </div>
        <CardDescription>
          Collect customer feedback directly through WhatsApp. Share a unique link tied to your project.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {whatsappLink ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-link">WhatsApp Feedback Link</Label>
              <div className="flex space-x-2">
                <Input
                  id="whatsapp-link"
                  value={whatsappLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  onClick={() => copyToClipboard(whatsappLink)}
                  size="sm"
                  variant="outline"
                >
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
            <p className="text-sm text-gray-600">
              Share this link with your customers. It will redirect them to WhatsApp with your project ID pre-attached, 
              so their feedback flows into your NoteX dashboard and AI insights.
            </p>
            <Button
              onClick={generateWhatsAppLink}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Link
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">
              Generate a WhatsApp feedback link for your project
            </p>
            <Button
              onClick={generateWhatsAppLink}
              disabled={loading || !projectId}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Generate Link
                </>
              )}
            </Button>
            {!projectId && (
              <p className="text-sm text-red-500 mt-2">
                Project ID is required to generate WhatsApp link
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}