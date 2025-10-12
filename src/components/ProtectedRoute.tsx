import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus'
import { AccessLocked } from './AccessLocked'

interface ProtectedRouteProps {
  children: ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation()
  const { hasAccess, isLoading } = useSubscriptionStatus()

  // Always allow access to billing and account pages
  const publicPaths = ['/billing', '/account']
  const isPublicPath = publicPaths.some(path => location.pathname.startsWith(path))

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (isPublicPath) {
    return <>{children}</>
  }

  if (!hasAccess) {
    return <AccessLocked />
  }

  return <>{children}</>
}