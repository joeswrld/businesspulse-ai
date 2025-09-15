import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Crown, 
  ArrowUpRight, 
  Clock, 
  CreditCard,
  Zap,
  BarChart3,
  Brain,
  FileText,
  Users,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface BillingNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: any;
  created_at: string;
}

interface NotificationProps {
  className?: string;
  showAll?: boolean;
  maxItems?: number;
}

const BillingNotifications: React.FC<NotificationProps> = ({ 
  className = '', 
  showAll = false, 
  maxItems = 5 
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<BillingNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('billing_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(showAll ? 50 : maxItems);

      if (error) {
        console.error('Error loading notifications:', error);
        toast.error('Failed to load notifications');
        return;
      }

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      setMarkingAsRead(notificationId);
      
      const { error } = await supabase
        .from('billing_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        toast.error('Failed to mark notification as read');
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );

      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    } finally {
      setMarkingAsRead(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      
      if (unreadIds.length === 0) {
        toast.info('No unread notifications');
        return;
      }

      const { error } = await supabase
        .from('billing_notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        toast.error('Failed to mark notifications as read');
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );

      toast.success(`${unreadIds.length} notifications marked as read`);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'usage_warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'limit_reached':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'trial_ending':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'trial_expired':
        return <Clock className="h-5 w-5 text-red-600" />;
      case 'subscription_activated':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'subscription_cancelled':
        return <XCircle className="h-5 w-5 text-gray-600" />;
      case 'payment_failed':
        return <CreditCard className="h-5 w-5 text-red-600" />;
      case 'subscription_expired':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'usage_warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'limit_reached':
        return 'border-red-200 bg-red-50';
      case 'trial_ending':
        return 'border-blue-200 bg-blue-50';
      case 'trial_expired':
        return 'border-red-200 bg-red-50';
      case 'subscription_activated':
        return 'border-green-200 bg-green-50';
      case 'subscription_cancelled':
        return 'border-gray-200 bg-gray-50';
      case 'payment_failed':
        return 'border-red-200 bg-red-50';
      case 'subscription_expired':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getActionButton = (notification: BillingNotification) => {
    switch (notification.notification_type) {
      case 'usage_warning':
      case 'limit_reached':
        return (
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => window.location.href = '/billing'}
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
        );
      case 'trial_ending':
        return (
          <Button 
            size="sm" 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => window.location.href = '/billing'}
          >
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Upgrade Now
          </Button>
        );
      case 'trial_expired':
      case 'subscription_expired':
        return (
          <Button 
            size="sm" 
            className="bg-green-600 hover:bg-green-700"
            onClick={() => window.location.href = '/billing'}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Renew Subscription
          </Button>
        );
      case 'payment_failed':
        return (
          <Button 
            size="sm" 
            className="bg-red-600 hover:bg-red-700"
            onClick={() => window.location.href = '/billing'}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Update Payment
          </Button>
        );
      default:
        return (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => window.location.href = '/billing'}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Details
          </Button>
        );
    }
  };

  const getFeatureIcon = (featureType: string) => {
    switch (featureType) {
      case 'feedback':
        return <BarChart3 className="h-4 w-4" />;
      case 'ai_insights':
        return <Brain className="h-4 w-4" />;
      case 'reports':
        return <FileText className="h-4 w-4" />;
      case 'team_members':
        return <Users className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const formatNotificationTime = (createdAt: string) => {
    const now = new Date();
    const notificationTime = new Date(createdAt);
    const diffInHours = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Loading notifications...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">You're all caught up! We'll notify you about important updates.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
            >
              Mark All Read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`p-4 rounded-lg border transition-colors ${
                notification.is_read ? 'opacity-60' : ''
              } ${getNotificationColor(notification.notification_type)}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.notification_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-sm font-medium ${
                      notification.is_read ? 'text-gray-600' : 'text-gray-900'
                    }`}>
                      {notification.title}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">
                        {formatNotificationTime(notification.created_at)}
                      </span>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  
                  <p className={`text-sm mb-3 ${
                    notification.is_read ? 'text-gray-500' : 'text-gray-700'
                  }`}>
                    {notification.message}
                  </p>
                  
                  {/* Show feature-specific info for usage notifications */}
                  {notification.notification_type === 'usage_warning' && notification.metadata?.feature_type && (
                    <div className="flex items-center space-x-2 mb-3">
                      {getFeatureIcon(notification.metadata.feature_type)}
                      <span className="text-xs text-gray-600">
                        {notification.metadata.current_usage} / {notification.metadata.limit_amount} used
                        ({notification.metadata.usage_percentage}%)
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getActionButton(notification)}
                    </div>
                    
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        disabled={markingAsRead === notification.id}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {markingAsRead === notification.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          'Dismiss'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {!showAll && notifications.length >= maxItems && (
          <div className="mt-4 text-center">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/notifications'}
            >
              View All Notifications
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Toast notification component for real-time alerts
export const UsageLimitToast: React.FC<{
  featureType: string;
  currentUsage: number;
  limit: number;
  percentage: number;
}> = ({ featureType, currentUsage, limit, percentage }) => {
  const getFeatureName = () => {
    switch (featureType) {
      case 'feedback':
        return 'Feedback Responses';
      case 'ai_insights':
        return 'AI Insights';
      case 'reports':
        return 'Reports';
      case 'team_members':
        return 'Team Members';
      default:
        return featureType;
    }
  };

  const getSeverity = () => {
    if (percentage >= 100) return 'error';
    if (percentage >= 80) return 'warning';
    return 'info';
  };

  const severity = getSeverity();

  return (
    <div className={`p-4 rounded-lg border ${
      severity === 'error' ? 'border-red-200 bg-red-50' :
      severity === 'warning' ? 'border-yellow-200 bg-yellow-50' :
      'border-blue-200 bg-blue-50'
    }`}>
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-full ${
          severity === 'error' ? 'bg-red-100' :
          severity === 'warning' ? 'bg-yellow-100' :
          'bg-blue-100'
        }`}>
          {severity === 'error' ? (
            <XCircle className="h-5 w-5 text-red-600" />
          ) : severity === 'warning' ? (
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          ) : (
            <Bell className="h-5 w-5 text-blue-600" />
          )}
        </div>
        
        <div className="flex-1">
          <h4 className={`font-medium ${
            severity === 'error' ? 'text-red-900' :
            severity === 'warning' ? 'text-yellow-900' :
            'text-blue-900'
          }`}>
            {severity === 'error' ? 'Limit Reached' : 'Usage Warning'}
          </h4>
          <p className={`text-sm ${
            severity === 'error' ? 'text-red-700' :
            severity === 'warning' ? 'text-yellow-700' :
            'text-blue-700'
          }`}>
            You've used {currentUsage} of {limit} {getFeatureName().toLowerCase()} ({percentage}%)
          </p>
        </div>
        
        <Button 
          size="sm" 
          className={`${
            severity === 'error' ? 'bg-red-600 hover:bg-red-700' :
            severity === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
            'bg-blue-600 hover:bg-blue-700'
          }`}
          onClick={() => window.location.href = '/billing'}
        >
          <Crown className="h-4 w-4 mr-2" />
          Upgrade
        </Button>
      </div>
    </div>
  );
};

export default BillingNotifications;