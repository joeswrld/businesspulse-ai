import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  X, 
  Minimize2, 
  Maximize2,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { useSessionRecording } from '@/hooks/useSessionRecording';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackWidgetProps {
  projectId: string;
  title?: string;
  color?: string;
  greetingText?: string;
  onFeedbackSubmitted?: (feedback: any) => void;
}

const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({
  projectId,
  title = "Share your feedback with us!",
  color = "#3B82F6",
  greetingText = "Welcome, tell us what's on your mind",
  onFeedbackSubmitted
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionRecordingEnabled, setSessionRecordingEnabled] = useState(true);
  const [showRecordingStatus, setShowRecordingStatus] = useState(false);

  const {
    isRecording,
    sessionId,
    eventsCount,
    error: recordingError,
    startRecording,
    stopRecording,
    getBehaviorAnalysis
  } = useSessionRecording({
    projectId,
    autoStart: false,
    onSessionStart: (id) => {
      console.log('Session recording started:', id);
      setShowRecordingStatus(true);
    },
    onSessionEnd: (id) => {
      console.log('Session recording ended:', id);
      setShowRecordingStatus(false);
    },
    onError: (error) => {
      console.error('Session recording error:', error);
      setSessionRecordingEnabled(false);
    }
  });

  // Start recording when widget opens
  useEffect(() => {
    if (isOpen && sessionRecordingEnabled && !isRecording) {
      startRecording();
    }
  }, [isOpen, sessionRecordingEnabled, isRecording, startRecording]);

  // Stop recording when widget closes
  useEffect(() => {
    if (!isOpen && isRecording) {
      stopRecording();
    }
  }, [isOpen, isRecording, stopRecording]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Get behavior analysis before submitting
      const behaviorAnalysis = getBehaviorAnalysis();
      
      // Submit feedback with session ID
      const { data, error } = await supabase
        .from('feedback')
        .insert({
          project_id: projectId,
          email: email.trim() || null,
          message: message.trim(),
          session_id: sessionId
        })
        .select()
        .single();

      if (error) {
        console.error('Error submitting feedback:', error);
        throw error;
      }

      // If we have behavior analysis, create behavior analysis record
      if (behaviorAnalysis && sessionId) {
        try {
          await supabase
            .from('behavior_analysis')
            .insert({
              session_id: sessionId,
              feedback_id: data.id,
              rage_clicks: behaviorAnalysis.rageClicks,
              scroll_behavior_score: behaviorAnalysis.scrollBehavior === 'erratic' ? 0.2 : 
                                   behaviorAnalysis.scrollBehavior === 'smooth' ? 0.8 : 0.5,
              time_on_page_seconds: behaviorAnalysis.timeOnPage,
              behavior_sentiment: behaviorAnalysis.rageClicks > 2 ? 'frustrated' : 
                                behaviorAnalysis.scrollBehavior === 'erratic' ? 'negative' : 'neutral'
            });
        } catch (behaviorError) {
          console.error('Error saving behavior analysis:', behaviorError);
          // Don't fail the feedback submission if behavior analysis fails
        }
      }

      // Call success callback
      onFeedbackSubmitted?.(data);

      // Reset form
      setEmail('');
      setMessage('');
      setIsOpen(false);
      setIsMinimized(false);

      // Stop recording after successful submission
      if (isRecording) {
        await stopRecording();
      }

    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleWidget = () => {
    if (isMinimized) {
      setIsMinimized(false);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Floating button (always visible)
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={toggleWidget}
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200"
          style={{ backgroundColor: color }}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Card className="w-80 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium" style={{ color }}>
                {title}
              </CardTitle>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMinimize}
                  className="h-6 w-6 p-0"
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleWidget}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Full widget
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="w-80 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold" style={{ color }}>
              {title}
            </CardTitle>
            <div className="flex items-center space-x-1">
              {sessionRecordingEnabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleRecording}
                  className="h-6 w-6 p-0"
                  title={isRecording ? "Stop recording" : "Start recording"}
                >
                  {isRecording ? (
                    <Eye className="h-3 w-3 text-red-500" />
                  ) : (
                    <EyeOff className="h-3 w-3 text-gray-400" />
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMinimize}
                className="h-6 w-6 p-0"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleWidget}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-600">{greetingText}</p>
          
          {/* Recording Status */}
          {showRecordingStatus && isRecording && (
            <div className="flex items-center space-x-2 mt-2">
              <Badge variant="outline" className="text-xs">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1"></div>
                Recording
              </Badge>
              {eventsCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {eventsCount} events
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Your email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <Textarea
                placeholder="Tell us what you think..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full resize-none"
                required
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {sessionRecordingEnabled && isRecording && (
                  <span>Session recording active</span>
                )}
              </div>
              
              <Button
                type="submit"
                disabled={!message.trim() || isSubmitting}
                className="flex items-center space-x-2"
                style={{ backgroundColor: color }}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>{isSubmitting ? 'Sending...' : 'Send'}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackWidget;