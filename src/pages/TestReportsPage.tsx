import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import DebugRouter from '@/components/DebugRouter';

const TestReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Executive Reports Test Page</h1>
        <p className="text-muted-foreground">
          This is a test page to verify routing is working correctly.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Test Page Loaded Successfully</span>
          </CardTitle>
          <CardDescription>
            If you can see this, the routing is working correctly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-green-600 font-medium">
            ✅ The Executive Reports page is loading correctly!
          </p>
          <p className="text-muted-foreground mt-2">
            This confirms that the routing and component rendering is working as expected.
          </p>
        </CardContent>
      </Card>

      <DebugRouter />
    </div>
  );
};

export default TestReportsPage;