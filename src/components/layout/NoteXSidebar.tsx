import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  BarChart3, 
  Brain, 
  FileText, 
  Settings, 
  Crown,
  Lock,
  MessageSquare,
  QrCode,
  Mail
} from 'lucide-react';
import { useUnifiedTrial } from '@/contexts/UnifiedTrialContext';
import NoteXTrialCountdown from '@/components/NoteXTrialCountdown';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresActiveSubscription?: boolean;
  locked?: boolean;
}

const NoteXSidebar: React.FC = () => {
  const location = useLocation();
  const { checkAccess, isTrialExpired, trialStatus } = useUnifiedTrial();

  const sidebarItems: SidebarItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      requiresActiveSubscription: false,
    },
    {
      name: 'Feedback',
      href: '/feedback',
      icon: MessageSquare,
      requiresActiveSubscription: false,
    },
    {
      name: 'QR Forms',
      href: '/feedback-settings',
      icon: QrCode,
      requiresActiveSubscription: false,
    },
    {
      name: 'Email Forms',
      href: '/feedback-settings',
      icon: Mail,
      requiresActiveSubscription: false,
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      requiresActiveSubscription: false,
    },
    {
      name: 'Insights',
      href: '/insights-simple',
      icon: Brain,
      requiresActiveSubscription: false,
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: FileText,
      requiresActiveSubscription: false,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      requiresActiveSubscription: false,
    },
  ];

  const isItemLocked = (item: SidebarItem): boolean => {
    // Business plan users never have locked items
    if (trialStatus.plan === 'business' && trialStatus.isActive) return false;
    
    // Trial expired users have locked items
    if (isTrialExpired()) return true;
    
    return false;
  };

  const canAccessItem = (item: SidebarItem): boolean => {
    // Business plan users can access everything
    if (trialStatus.plan === 'business' && trialStatus.isActive) return true;
    
    // Trial users can access everything during trial
    if (trialStatus.plan === 'free_trial' && trialStatus.isActive && !isTrialExpired()) return true;
    
    return false;
  };

  // If trial expired, show only upgrade button
  if (isTrialExpired()) {
    return (
      <div className="flex flex-col h-full bg-white border-r border-gray-200">
        <div className="p-4">
          <div className="flex items-center justify-center mb-6">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <Lock className="h-5 w-5 text-red-600" />
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Trial Expired</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your free trial has ended. Upgrade to the Business Plan to continue using NoteX.
            </p>
          </div>

          <Button 
            asChild
            className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
            size="lg"
          >
            <Link to="/billing">
              <Crown className="h-5 w-5 mr-2" />
              Upgrade to Business
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Trial Status */}
      <div className="p-4 border-b border-gray-200">
        <NoteXTrialCountdown variant="card" showUpgradeButton={true} />
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.href;
          const locked = isItemLocked(item);
          const canAccess = canAccessItem(item);

          return (
            <div key={item.name} className="relative">
              {locked ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center">
                    <item.icon className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-sm font-medium text-gray-500">{item.name}</span>
                  </div>
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
              ) : (
                <Link
                  to={canAccess ? item.href : '#'}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : canAccess
                      ? 'hover:bg-gray-50 text-gray-700'
                      : 'text-gray-400 cursor-not-allowed'
                  )}
                  onClick={(e) => {
                    if (!canAccess) {
                      e.preventDefault();
                    }
                  }}
                >
                  <div className="flex items-center">
                    <item.icon className="h-5 w-5 mr-3" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  {!canAccess && <Lock className="h-4 w-4" />}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* Upgrade Button for trial users */}
      {trialStatus.plan === 'free_trial' && trialStatus.isActive && !isTrialExpired() && (
        <div className="p-4 border-t border-gray-200">
          <Button 
            asChild
            className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
            size="lg"
          >
            <Link to="/billing">
              <Crown className="h-5 w-5 mr-2" />
              Upgrade to Business
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default NoteXSidebar;