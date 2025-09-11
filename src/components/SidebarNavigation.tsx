import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  MessageSquare, 
  Brain, 
  BarChart3, 
  TrendingUp, 
  Users, 
  CreditCard, 
  Settings, 
  User, 
  LogOut,
  Lock,
  Zap
} from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import { useUserAccess } from './RouteProtection'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  path: string
  requiresAccess: boolean
  allowedWhenExpired?: boolean
}

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
    path: '/dashboard',
    requiresAccess: true
  },
  {
    id: 'feedback',
    label: 'Feedback',
    icon: <MessageSquare className="h-5 w-5" />,
    path: '/feedback',
    requiresAccess: true
  },
  {
    id: 'insights',
    label: 'AI Insights',
    icon: <Brain className="h-5 w-5" />,
    path: '/insights',
    requiresAccess: true
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <BarChart3 className="h-5 w-5" />,
    path: '/reports',
    requiresAccess: true
  },
  {
    id: 'analytics',
    label: 'Business Metrics',
    icon: <TrendingUp className="h-5 w-5" />,
    path: '/analytics',
    requiresAccess: true
  },
  {
    id: 'teams',
    label: 'Team',
    icon: <Users className="h-5 w-5" />,
    path: '/teams',
    requiresAccess: true
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: <CreditCard className="h-5 w-5" />,
    path: '/billing',
    requiresAccess: false,
    allowedWhenExpired: true
  },
  {
    id: 'widget-settings',
    label: 'Widget Settings',
    icon: <Settings className="h-5 w-5" />,
    path: '/feedback-settings',
    requiresAccess: true
  },
  {
    id: 'account-settings',
    label: 'Account Settings',
    icon: <Settings className="h-5 w-5" />,
    path: '/settings',
    requiresAccess: false,
    allowedWhenExpired: true
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: <User className="h-5 w-5" />,
    path: '/profile',
    requiresAccess: false,
    allowedWhenExpired: true
  }
]

interface SidebarNavigationProps {
  className?: string
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ className }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { userAccess, loading } = useUserAccess()

  const handleSignOut = async () => {
    try {
      const { supabase } = await import('../integrations/supabase/client')
      await supabase.auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleNavigation = (item: NavItem) => {
    if (!userAccess) return

    // Check if user has access
    if (item.requiresAccess && !userAccess.has_access) {
      // If this item is allowed when expired, navigate to it
      if (item.allowedWhenExpired) {
        navigate(item.path)
        return
      }
      
      // Otherwise, show upgrade prompt
      navigate('/billing?upgrade=true')
      return
    }

    navigate(item.path)
  }

  const isItemDisabled = (item: NavItem) => {
    if (!userAccess) return true
    if (!item.requiresAccess) return false
    if (item.allowedWhenExpired) return false
    return !userAccess.has_access
  }

  const getItemTooltip = (item: NavItem) => {
    if (!userAccess) return ''
    if (!item.requiresAccess) return ''
    if (item.allowedWhenExpired) return ''
    if (!userAccess.has_access) {
      return 'Upgrade to Business Plan to unlock'
    }
    return ''
  }

  if (loading) {
    return (
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-64 bg-white border-r border-gray-200 flex flex-col", className)}>
      {/* Logo/Brand */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">NoteX</h1>
        {userAccess && (
          <div className="mt-2">
            <div className="flex items-center space-x-2">
              {userAccess.has_access ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {userAccess.is_subscription_active ? 'Business' : 'Trial'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-red-600">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm font-medium">Expired</span>
                </div>
              )}
            </div>
            {userAccess.is_trial_active && userAccess.trial_expires_at && (
              <p className="text-xs text-gray-500 mt-1">
                Trial expires {new Date(userAccess.trial_expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path))
          const isDisabled = isItemDisabled(item)
          const tooltip = getItemTooltip(item)

          return (
            <div key={item.id} className="relative group">
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start text-left h-10",
                  isActive && "bg-blue-100 text-blue-700",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleNavigation(item)}
                disabled={isDisabled}
              >
                <span className={cn("mr-3", isDisabled && "text-gray-400")}>
                  {item.icon}
                </span>
                <span className={cn(isDisabled && "text-gray-400")}>
                  {item.label}
                </span>
                {isDisabled && (
                  <Lock className="h-4 w-4 ml-auto text-gray-400" />
                )}
              </Button>
              
              {tooltip && (
                <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  {tooltip}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          className="w-full justify-start text-left h-10 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}