import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, X, Send, Palette, Eye } from 'lucide-react';

interface WidgetPreviewProps {
  widgetTitle: string;
  widgetColor: string;
  greetingText: string;
  projectId?: string;
}

const WidgetPreview: React.FC<WidgetPreviewProps> = ({
  widgetTitle,
  widgetColor,
  greetingText,
  projectId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulate widget behavior
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setMessage('');
    setIsOpen(false);
    setIsSubmitting(false);
    
    // Show success message
    alert('Thank you for your feedback! (This is a preview)');
  };

  // Generate embed code
  const embedCode = `<script src="https://notex.com.ng/widget.js" data-project-id="${projectId || 'your-project-id'}"></script>`;

  return (
    <div className="space-y-6">
      {/* Preview Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Live Preview</span>
          </CardTitle>
          <CardDescription>
            See how your widget will look to your users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <Button
              onClick={() => setIsOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
              style={{ backgroundColor: widgetColor }}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Test Widget
            </Button>
            <Badge variant="outline" className="text-gray-600">
              Click to preview
            </Badge>
          </div>
          
          {/* Preview Info */}
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Title:</strong> {widgetTitle}</p>
            <p><strong>Color:</strong> <span className="inline-block w-4 h-4 rounded border" style={{ backgroundColor: widgetColor }}></span> {widgetColor}</p>
            <p><strong>Greeting:</strong> {greetingText}</p>
          </div>
        </CardContent>
      </Card>

      {/* Embed Code */}
      <Card>
        <CardHeader>
          <CardTitle>Embed Code</CardTitle>
          <CardDescription>
            Copy this code to your website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{embedCode}</code>
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute top-2 right-2"
              onClick={() => {
                navigator.clipboard.writeText(embedCode);
                alert('Code copied to clipboard!');
              }}
            >
              Copy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Widget Modal Preview */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Widget Header */}
            <div 
              className="p-4 text-white rounded-t-lg flex items-center justify-between"
              style={{ backgroundColor: widgetColor }}
            >
              <h3 className="font-semibold">{widgetTitle}</h3>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white hover:bg-opacity-20"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Widget Content */}
            <div className="p-4">
              <p className="text-gray-600 mb-4">{greetingText}</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="Share your thoughts..."
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!message.trim() || isSubmitting}
                    style={{ backgroundColor: widgetColor }}
                    className="text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Feedback
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WidgetPreview;