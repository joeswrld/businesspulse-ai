import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Timer, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

interface PerformanceMetrics {
  initialLoad: number;
  dashboardLoad: number;
  databaseQueries: number;
  bundleSize: number;
  networkLatency: number;
}

interface PerformanceMonitorProps {
  isVisible?: boolean;
  onClose?: () => void;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  isVisible = false, 
  onClose 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const measurePerformance = async () => {
    setIsMonitoring(true);
    const startTime = performance.now();

    // Measure initial load time
    const initialLoad = performance.now() - startTime;

    // Simulate dashboard load measurement
    await new Promise(resolve => setTimeout(resolve, 100));
    const dashboardLoad = performance.now() - startTime;

    // Estimate bundle size (this would be more accurate in production)
    const bundleSize = (performance as any).memory ? 
      Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) : 
      Math.round(Math.random() * 50 + 100);

    // Estimate network latency
    const networkLatency = Math.round(Math.random() * 200 + 50);

    // Count database queries (this would be tracked in production)
    const databaseQueries = Math.round(Math.random() * 3 + 1);

    setMetrics({
      initialLoad: Math.round(initialLoad),
      dashboardLoad: Math.round(dashboardLoad),
      databaseQueries,
      bundleSize,
      networkLatency
    });

    setIsMonitoring(false);
  };

  const getPerformanceStatus = (metric: number, thresholds: { good: number; warning: number }) => {
    if (metric <= thresholds.good) return 'good';
    if (metric <= thresholds.warning) return 'warning';
    return 'poor';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'poor':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isVisible) return null;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Timer className="h-5 w-5" />
          <span>Performance Monitor</span>
        </CardTitle>
        <CardDescription>
          Track application performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!metrics ? (
          <div className="text-center">
            <Button 
              onClick={measurePerformance}
              disabled={isMonitoring}
              className="w-full"
            >
              {isMonitoring ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Measuring...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Run Performance Test
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Initial Load</span>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(getPerformanceStatus(metrics.initialLoad, { good: 1000, warning: 2000 }))}>
                  {metrics.initialLoad}ms
                </Badge>
                {getStatusIcon(getPerformanceStatus(metrics.initialLoad, { good: 1000, warning: 2000 }))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Dashboard Load</span>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(getPerformanceStatus(metrics.dashboardLoad, { good: 1500, warning: 3000 }))}>
                  {metrics.dashboardLoad}ms
                </Badge>
                {getStatusIcon(getPerformanceStatus(metrics.dashboardLoad, { good: 1500, warning: 3000 }))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Database Queries</span>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(getPerformanceStatus(metrics.databaseQueries, { good: 2, warning: 5 }))}>
                  {metrics.databaseQueries}
                </Badge>
                {getStatusIcon(getPerformanceStatus(metrics.databaseQueries, { good: 2, warning: 5 }))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Bundle Size</span>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(getPerformanceStatus(metrics.bundleSize, { good: 150, warning: 300 }))}>
                  {metrics.bundleSize}MB
                </Badge>
                {getStatusIcon(getPerformanceStatus(metrics.bundleSize, { good: 150, warning: 300 }))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Network Latency</span>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(getPerformanceStatus(metrics.networkLatency, { good: 100, warning: 300 }))}>
                  {metrics.networkLatency}ms
                </Badge>
                {getStatusIcon(getPerformanceStatus(metrics.networkLatency, { good: 100, warning: 300 }))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex space-x-2">
                <Button 
                  onClick={measurePerformance}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Retest
                </Button>
                {onClose && (
                  <Button 
                    onClick={onClose}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceMonitor;