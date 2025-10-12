import { Link } from 'react-router-dom'
import { Lock, CreditCard, Clock } from 'lucide-react'
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus'

export const AccessLocked = () => {
  const { status, daysRemaining, isTrialActive } = useSubscriptionStatus()

  const getStatusMessage = () => {
    if (status === 'expired') {
      return {
        title: 'Trial Expired',
        message: 'Your free trial has ended. Upgrade to continue using NoteX.',
        icon: Clock,
        showDays: false
      }
    }
    
    if (status === 'failed') {
      return {
        title: 'Payment Failed',
        message: 'There was an issue with your payment. Please update your billing information.',
        icon: CreditCard,
        showDays: false
      }
    }
    
    if (status === 'cancelled') {
      return {
        title: 'Subscription Cancelled',
        message: 'Your subscription has been cancelled. Reactivate to continue using NoteX.',
        icon: Lock,
        showDays: false
      }
    }
    
    return {
      title: 'Access Restricted',
      message: 'Please upgrade your account to access this feature.',
      icon: Lock,
      showDays: false
    }
  }

  const statusInfo = getStatusMessage()
  const Icon = statusInfo.icon

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <Icon className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              {statusInfo.title}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {statusInfo.message}
            </p>
            
            {isTrialActive && daysRemaining > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <Clock className="inline h-4 w-4 mr-1" />
                  {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining in your trial
                </p>
              </div>
            )}
          </div>

          <div className="mt-8">
            <div className="space-y-4">
              <Link
                to="/billing"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Link>
              
              <Link
                to="/account"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Manage Account
              </Link>
            </div>
          </div>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Pro Plan Features</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Unlimited Feedback</p>
                  <p className="text-sm text-gray-500">Collect unlimited customer feedback</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">AI-Powered Insights</p>
                  <p className="text-sm text-gray-500">Get intelligent analysis and suggestions</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Team Collaboration</p>
                  <p className="text-sm text-gray-500">Invite team members and assign feedback</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Advanced Analytics</p>
                  <p className="text-sm text-gray-500">Detailed reports and export options</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}