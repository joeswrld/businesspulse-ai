import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUsageOverview } from '@/hooks/useUsageOverview';

interface UsageOverviewDebugProps {
  userId: string;
}

export default function UsageOverviewDebug({ userId }: UsageOverviewDebugProps) {
  const { data, loading, error } = useUsageOverview(userId);

  if (loading) {
    return (
      <Card className="p-4">
        <CardHeader>
          <CardTitle>Debug: Usage Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Debug: Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-4 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-600">Debug: No Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-yellow-600">No data available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-blue-200">
      <CardHeader>
        <CardTitle className="text-blue-600">Debug: Usage Overview Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">User ID</h4>
          <code className="text-xs bg-gray-100 p-2 rounded block">{userId}</code>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Subscription Data</h4>
          <div className="bg-gray-50 p-3 rounded text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <strong>Plan Type:</strong> 
                <Badge variant="outline" className="ml-2">{data.subscription.plan_type}</Badge>
              </div>
              <div>
                <strong>Is Active:</strong> 
                <Badge variant={data.subscription.is_active ? "default" : "secondary"} className="ml-2">
                  {data.subscription.is_active ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <strong>Trial Start:</strong> 
                <span className="text-gray-600">{data.subscription.trial_start || "N/A"}</span>
              </div>
              <div>
                <strong>Trial End:</strong> 
                <span className="text-gray-600">{data.subscription.trial_end || "N/A"}</span>
              </div>
              <div>
                <strong>Renewal Date:</strong> 
                <span className="text-gray-600">{data.subscription.renewal_date || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Usage Data</h4>
          <div className="bg-gray-50 p-3 rounded text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><strong>Feedback:</strong> {data.usage.feedback_count}</div>
              <div><strong>Insights:</strong> {data.usage.insights_count}</div>
              <div><strong>Analytics:</strong> {data.usage.analytics_count}</div>
              <div><strong>Reports:</strong> {data.usage.reports_count}</div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Limits</h4>
          <div className="bg-gray-50 p-3 rounded text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><strong>Feedback:</strong> {data.limits.feedback === -1 ? "Unlimited" : data.limits.feedback}</div>
              <div><strong>Insights:</strong> {data.limits.insights === -1 ? "Unlimited" : data.limits.insights}</div>
              <div><strong>Analytics:</strong> {data.limits.analytics === -1 ? "Unlimited" : data.limits.analytics}</div>
              <div><strong>Reports:</strong> {data.limits.reports === -1 ? "Unlimited" : data.limits.reports}</div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Status</h4>
          <div className="bg-gray-50 p-3 rounded text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <strong>Trial Expired:</strong> 
                <Badge variant={data.isTrialExpired ? "destructive" : "default"} className="ml-2">
                  {data.isTrialExpired ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <strong>Month Start:</strong> 
                <span className="text-gray-600">{data.monthStart}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Raw Data (JSON)</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}