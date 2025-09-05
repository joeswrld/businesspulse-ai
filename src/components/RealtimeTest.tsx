import React, { useState } from 'react';
import { useRealtimeFeedback } from '@/hooks/useRealtimeFeedback';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FeedbackBadgeGroup } from '@/components/ui/FeedbackBadge';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, RefreshCw, CheckCircle, Eye, Clock } from 'lucide-react';

export const RealtimeTest: React.FC = () => {
  const { 
    feedbacks, 
    counts, 
    loading, 
    error, 
    realtimeStatus, 
    loadFeedbacks 
  } = useRealtimeFeedback();

  const [testMessage, setTestMessage] = useState('');

  const addTestFeedback = async () => {
    if (!testMessage.trim()) return;

    try {
      // This would normally be done through the widget, but for testing we can insert directly
      const { data, error } = await (supabase as any)
        .from('feedbacks')
        .insert({
          project_id: 'test-project',
          name: 'Test User',
          email: 'test@example.com',
          message: testMessage,
          status: 'new'
        });

      if (error) {
        console.error('Error adding test feedback:', error);
      } else {
        setTestMessage('');
        console.log('Test feedback added:', data);
      }
    } catch (error) {
      console.error('Error in addTestFeedback:', error);
    }
  };

  const updateFeedbackStatus = async (feedbackId: string, newStatus: 'new' | 'reviewed' | 'resolved') => {
    try {
      const { error } = await (supabase as any)
        .from('feedbacks')
        .update({ status: newStatus })
        .eq('id', feedbackId);

      if (error) {
        console.error('Error updating feedback status:', error);
      } else {
        console.log('Feedback status updated:', feedbackId, newStatus);
      }
    } catch (error) {
      console.error('Error in updateFeedbackStatus:', error);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5" />
          <span>Real-time Feedback Test</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status and Counts */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge 
              variant={realtimeStatus === 'connected' ? 'default' : 'destructive'}
              className="flex items-center space-x-1"
            >
              <div className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'connected' ? 'bg-green-500' : 
                realtimeStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="capitalize">{realtimeStatus}</span>
            </Badge>
            <FeedbackBadgeGroup counts={counts} />
          </div>
          <Button
            variant="outline"
            onClick={loadFeedbacks}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Test Controls */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Test Real-time Updates</h3>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter test feedback message..."
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              onKeyPress={(e) => e.key === 'Enter' && addTestFeedback()}
            />
            <Button onClick={addTestFeedback} disabled={!testMessage.trim()}>
              Add Test Feedback
            </Button>
          </div>
        </div>

        {/* Feedback List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Current Feedbacks ({feedbacks.length})</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading feedbacks...</span>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No feedbacks found. Add some test feedback above.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {feedbacks.map((feedback) => (
                <Card key={feedback.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant={
                          feedback.status === 'new' ? 'secondary' : 
                          feedback.status === 'reviewed' ? 'default' : 'outline'
                        }>
                          {feedback.status === 'new' && <Clock className="h-3 w-3 mr-1" />}
                          {feedback.status === 'reviewed' && <Eye className="h-3 w-3 mr-1" />}
                          {feedback.status === 'resolved' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {feedback.status}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {feedback.name || 'Anonymous'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(feedback.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{feedback.message}</p>
                    </div>
                    <div className="flex space-x-1">
                      {feedback.status !== 'resolved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateFeedbackStatus(feedback.id, 'resolved')}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                      )}
                      {feedback.status === 'new' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateFeedbackStatus(feedback.id, 'reviewed')}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">Error: {error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};