import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mail, Copy, Check, RefreshCw, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EmailSignatureFeedbackSectionProps {
  projectId: string;
}

export default function EmailSignatureFeedbackSection({ projectId }: EmailSignatureFeedbackSectionProps) {
  const [emailLink, setEmailLink] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('Give us feedback:');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Load existing email link when component mounts
  useEffect(() => {
    const loadExistingLink = async () => {
      if (!projectId) return;

      try {
        console.log('Loading existing email link for project:', projectId);
        const { data: existingLink, error } = await supabase
          .from('email_links')
          .select('link')
          .eq('project_id', projectId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.warn('Error loading existing email link:', error);
        } else if (!error && existingLink) {
          console.log('Loaded existing email link:', existingLink.link);
          setEmailLink(existingLink.link);
        } else {
          console.log('No existing email link found for project:', projectId);
        }
      } catch (error) {
        console.warn('Unexpected error loading existing email link:', error);
      }
    };

    loadExistingLink();
  }, [projectId]);

  const generateEmailLink = async () => {
    if (!projectId) {
      toast.error('Project ID is required to generate email link');
      return;
    }

    setLoading(true);
    try {
      console.log('Generating email link for project:', projectId);

      // Check if link already exists for this project
      const { data: existingLink, error: fetchError } = await supabase
        .from('email_links')
        .select('link')
        .eq('project_id', projectId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching existing email link:', fetchError);
        throw new Error(`Failed to check existing links: ${fetchError.message}`);
      }

      // If link already exists, use it
      if (existingLink) {
        console.log('Found existing email link:', existingLink.link);
        setEmailLink(existingLink.link);
        toast.success('Email link loaded successfully!');
        return;
      }

      // Generate new email link
      const emailLinkUrl = `https://notex.com.ng/feedback/email/${projectId}`;
      console.log('Generated new email link:', emailLinkUrl);

      // Insert new link into database
      const { data: newLink, error: insertError } = await supabase
        .from('email_links')
        .insert({
          project_id: projectId,
          link: emailLinkUrl
        })
        .select('link')
        .single();

      if (insertError) {
        console.error('Error inserting email link:', insertError);
        throw new Error(`Failed to create email link: ${insertError.message}`);
      }

      console.log('Successfully created email link:', newLink.link);
      setEmailLink(newLink.link);
      toast.success('Email link generated successfully!');
    } catch (error) {
      console.error('Error generating email link:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to generate email link: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const getEmailSnippet = () => {
    if (!emailLink) return '';
    
    const emojis = '😀 😐 😡';
    return `${customMessage} ${emailLink} ${emojis}`;
  };

  const getHTMLSnippet = () => {
    if (!emailLink) return '';
    
    const emojis = '😀 😐 😡';
    return `${customMessage} <a href="${emailLink}">${emailLink}</a> ${emojis}`;
  };

  const copyToClipboard = async (text: string, type: 'text' | 'html') => {
    try {
      if (type === 'html') {
        // For HTML, we'll copy as plain text for now
        // In a more advanced implementation, you might want to copy actual HTML
        await navigator.clipboard.writeText(text);
      } else {
        await navigator.clipboard.writeText(text);
      }
      
      setCopied(true);
      toast.success(`${type === 'html' ? 'HTML' : 'Text'} snippet copied to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <span>Email Signature Feedback</span>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Channel: Email
          </Badge>
        </CardTitle>
        <CardDescription>
          Collect feedback directly from your emails. Add this small link or emoji rating to your email signature. All feedback goes straight into NoteX AI insights.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {emailLink ? (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-link">Email Feedback Link</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  {isEditing ? 'Done' : 'Customize'}
                </Button>
              </div>
              
              <Input
                id="email-link"
                readOnly
                value={emailLink}
                className="bg-gray-50 border-gray-200"
              />

              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="custom-message">Custom Message</Label>
                  <Textarea
                    id="custom-message"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Give us feedback:"
                    className="min-h-[60px]"
                  />
                  <p className="text-xs text-gray-500">
                    This message will appear before the link in your email signature.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Label>Email Signature Snippets</Label>
              
              <div className="space-y-3">
                <div className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Plain Text Version</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(getEmailSnippet(), 'text')}
                      disabled={copied}
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-700 font-mono break-all">
                    {getEmailSnippet()}
                  </p>
                </div>

                <div className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">HTML Version</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(getHTMLSnippet(), 'html')}
                      disabled={copied}
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-700 font-mono break-all">
                    {getHTMLSnippet()}
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={generateEmailLink}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate Email Link
            </Button>
          </>
        ) : (
          <Button onClick={generateEmailLink} disabled={loading} className="w-full">
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Generate Email Link
          </Button>
        )}
        
        <p className="text-sm text-gray-500 mt-2">
          Add the copied snippet to your email signature. The emojis provide a quick visual way for customers to rate their experience.
        </p>
      </CardContent>
    </Card>
  );
}