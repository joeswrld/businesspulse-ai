import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppFeedbackSectionProps {
  projectId: string;
}

export default function WhatsAppFeedbackSection({ projectId }: WhatsAppFeedbackSectionProps) {
  const [whatsappLink, setWhatsappLink] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateWhatsAppLink = async () => {
    if (!projectId) {
      toast.error('Project ID is required to generate WhatsApp link');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/feedback/whatsapp-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ project_id: projectId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate WhatsApp link');
      }

      const data = await response.json();
      setWhatsappLink(data.link);
      toast.success('WhatsApp link generated successfully!');
    } catch (error) {
      console.error('Error generating WhatsApp link:', error);
      toast.error('Failed to generate WhatsApp link. Please try again.');
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