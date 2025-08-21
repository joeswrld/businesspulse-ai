import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

const FeedbackSimple = () => {
  console.log('FeedbackSimple component rendering...');
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-6">
          <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mr-6 shadow-lg">
            <MessageSquare className="h-10 w-10 text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
              Feedback Management
            </h1>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Live & Real-time
              </Badge>
              <span className="text-sm text-gray-500 font-medium">
                Powered by NoteX
              </span>
            </div>
          </div>
        </div>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Live view and manage all feedback from your website visitors in real-time.
        </p>
        <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Real-time updates
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            Bulk actions
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Smart filtering
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Simple Feedback Page</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">This is a simple version of the Feedback page to test if the issue is with the complex logic.</p>
            <p className="mb-4">If you can see this, the basic rendering is working.</p>
            <Button onClick={() => alert('Button clicked!')}>
              Test Button
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FeedbackSimple;