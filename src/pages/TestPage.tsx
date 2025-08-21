import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TestPage = () => {
  console.log('TestPage component rendering...');
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Test Page</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">This is a test page to verify routing is working.</p>
          <p className="mb-4">If you can see this, the basic routing and rendering is working.</p>
          <Button onClick={() => alert('Button clicked!')}>
            Test Button
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestPage;