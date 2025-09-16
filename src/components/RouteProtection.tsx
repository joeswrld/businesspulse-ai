import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../integrations/supabase/client'
import { LockScreen } from './LockScreen'

interface UserAccess {
  has_access: boolean
  is_trial_active: boolean
  is_subscription_active: boolean
  trial_expires_at: string | null
  subscription_status: string
  plan_status: string
}

interface RouteProtectionProps {
  children: React.ReactNode
  requireAccess?: boolean
  allowedWhenExpired?: boolean
}

// Routes that are always accessible even when expired
const ALLOWED_WHEN_EXPIRED = [
  '/billing',
  '/profile',
  '/settings',
  '/logout'
]

export const RouteProtection: React.FC<RouteProtectionProps> = ({
  children,
  requireAccess = true,
  allowedWhenExpired = false
}) => {
  const [userAccess, setUserAccess] = useState<UserAccess | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    checkUserAccess()
  }, [location.pathname])

  const checkUserAccess = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !currentUser) {
        // No user, redirect to login
        navigate('/login')
        return
      }

      setUser(currentUser)

      // Check if this route is allowed when expired
      const isAllowedWhenExpired = allowedWhenExpired || 
        ALLOWED_WHEN_EXPIRED.some(route => location.pathname.startsWith(route))

      if (!requireAccess) {
        setUserAccess({
          has_access: true,
          is_trial_active: true,
          is_subscription_active: true,
          trial_expires_at: null,
          subscription_status: 'active',
          plan_status: 'active'
        })
        setLoading(false)
        return
      }

      // Get user access status
      const { data: accessData, error: accessError } = await supabase
        .rpc('check_user_access', { user_uuid: currentUser.id })

      if (accessError || !accessData || accessData.length === 0) {
        console.error('Error checking user access:', accessError)
        navigate('/login')
        return
      }

      const access = accessData[0]
      setUserAccess(access)

      // UNLOCKED PLATFORM: Always allow access regardless of subscription status
      // if (!access.has_access) {
      //   if (isAllowedWhenExpired) {
      //     // Allow access to billing/profile pages even when expired
      //     setLoading(false)
      //     return
      //   } else {
      //     // Redirect to billing with upgrade prompt
      //     navigate('/billing?upgrade=true')
      //     return
      //   }
      // }

      setLoading(false)
    } catch (error) {
      console.error('Error in RouteProtection:', error)
      navigate('/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  if (!userAccess) {
    return null // Will redirect to login
  }

  // UNLOCKED PLATFORM: Never show lock screen
  // if (requireAccess && !userAccess.has_access) {
  //   const isAllowedWhenExpired = allowedWhenExpired || 
  //     ALLOWED_WHEN_EXPIRED.some(route => location.pathname.startsWith(route))

  //   if (!isAllowedWhenExpired) {
  //     return (
  //       <LockScreen
  //         planStatus={userAccess.plan_status}
  //         trialExpiresAt={userAccess.trial_expires_at}
  //         onUpgrade={() => navigate('/billing?upgrade=true')}
  //       />
  //     )
  //   }
  // }

  return <>{children}</>
}

// Higher-order component for protecting routes
export const withRouteProtection = (
  Component: React.ComponentType<any>,
  options: { requireAccess?: boolean; allowedWhenExpired?: boolean } = {}
) => {
  return (props: any) => (
    <RouteProtection {...options}>
      <Component {...props} />
    </RouteProtection>
  )
}

// Hook for accessing user access information
export const useUserAccess = () => {
  const [userAccess, setUserAccess] = useState<UserAccess | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setUserAccess(null)
          setLoading(false)
          return
        }

        const { data: accessData, error } = await supabase
          .rpc('check_user_access', { user_uuid: user.id })

        if (error || !accessData || accessData.length === 0) {
          setUserAccess(null)
        } else {
          setUserAccess(accessData[0])
        }
      } catch (error) {
        console.error('Error fetching user access:', error)
        setUserAccess(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUserAccess()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchUserAccess()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { userAccess, loading }
}