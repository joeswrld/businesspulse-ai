import React from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const DebugRouter: React.FC = () => {
  const location = useLocation();

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-yellow-800">Debug Information</CardTitle>
        <CardDescription className="text-yellow-700">
          Current route and component information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Current Path:</strong> {location.pathname}
          </div>
          <div>
            <strong>Component:</strong> {location.pathname === '/insights-simple' ? 'InsightsPage' : 
                                        location.pathname === '/reports' ? 'Reports' : 'Unknown'}
          </div>
          <div>
            <strong>Timestamp:</strong> {new Date().toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DebugRouter;