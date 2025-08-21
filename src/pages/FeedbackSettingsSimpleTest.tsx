import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal } from "lucide-react";

const FeedbackSettingsSimpleTest = () => {
  console.log('FeedbackSettingsSimpleTest component rendering...');
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mr-4">
            <SlidersHorizontal className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Feedback Settings</h1>
            <Badge variant="secondary" className="mt-2">
              Live
            </Badge>
          </div>
        </div>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Customize your feedback widget and configure how you receive feedback from your website visitors.
        </p>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Simple Settings Page</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">This is a simple version of the Feedback Settings page to test if the issue is with the complex logic.</p>
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

export default FeedbackSettingsSimpleTest;