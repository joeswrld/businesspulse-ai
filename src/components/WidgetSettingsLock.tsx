import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Lock, 
  Crown, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap,
  ExternalLink
} from 'lucide-react';
import { useUnifiedTrial } from '@/contexts/UnifiedTrialContext';

interface WidgetSettingsLockProps {
  children: React.ReactNode;
  widgetType: 'feedback' | 'qr' | 'email' | 'embed';
  title: string;
  description: string;
}

export default function WidgetSettingsLock({ 
  children, 
  widgetType, 
  title, 
  description 
}: WidgetSettingsLockProps) {
  const { trialStatus, checkAccess, isTrialExpired, getTrialMessage } = useUnifiedTrial();

  // Check if widget should be disabled
  const shouldDisable = !checkAccess() || isTrialExpired();

  const handleUpgrade = () => {
    window.location.href = '/billing';
  };

  const getWidgetIcon = () => {
    switch (widgetType) {
      case 'feedback':
        return '💬';
      case 'qr':
        return '📱';
      case 'email':
        return '📧';
      case 'embed':
        return '🔗';
      default:
        return '⚙️';
    }
  };

  const getLockMessage = () => {
    if (trialStatus.plan === 'business' && !trialStatus.isActive) {
      return 'Your Business subscription is inactive. Reactivate to enable this widget.';
    }
    if (isTrialExpired()) {
      return 'Your free trial has expired. Upgrade to Business to enable this widget.';
    }
    return 'This widget is currently disabled.';
  };

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getWidgetIcon()}</span>
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {shouldDisable ? (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <Lock className="h-3 w-3 mr-1" />
                Disabled
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {shouldDisable ? (
          <div className="space-y-4">
            {/* Lock overlay */}
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-8 w-8 text-red-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Widget Disabled</h4>
                <p className="text-sm text-gray-600 mb-4">{getLockMessage()}</p>
                <Button
                  onClick={handleUpgrade}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {trialStatus.plan === 'business' ? 'Reactivate Subscription' : 'Upgrade to Business'}
                </Button>
              </div>
            </div>

            {/* Disabled content */}
            <div className="opacity-50 pointer-events-none">
              {children}
            </div>

            {/* Trial status info */}
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">Trial Status</p>
                  <p className="text-sm text-gray-600">{getTrialMessage()}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Active content
          <div>
            {children}
          </div>
        )}

        {/* Features info */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">What you get with Business:</h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span>Unlimited widget usage</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span>Custom branding</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span>Advanced analytics</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span>Priority support</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}