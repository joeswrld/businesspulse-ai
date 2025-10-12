import { Clock, AlertTriangle } from 'lucide-react'
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus'
import { Link } from 'react-router-dom'

export const TrialCountdown = () => {
  const { isTrialActive, isPaidActive, daysRemaining, status } = useSubscriptionStatus()

  // Don't show countdown for paid users
  if (isPaidActive) {
    return null
  }

  // Don't show countdown if not in trial
  if (!isTrialActive) {
    return null
  }

  const isUrgent = daysRemaining <= 2
  const isExpiring = daysRemaining <= 1

  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm ${
      isExpiring 
        ? 'bg-red-100 text-red-800 border border-red-200' 
        : isUrgent 
        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
        : 'bg-blue-100 text-blue-800 border border-blue-200'
    }`}>
      {isExpiring ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      
      <span>
        {daysRemaining === 0 
          ? 'Trial expires today'
          : daysRemaining === 1
          ? 'Trial expires tomorrow'
          : `${daysRemaining} days left in trial`
        }
      </span>
      
      <Link
        to="/billing"
        className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
          isExpiring
            ? 'bg-red-200 hover:bg-red-300 text-red-900'
            : isUrgent
            ? 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900'
            : 'bg-blue-200 hover:bg-blue-300 text-blue-900'
        }`}
      >
        Upgrade
      </Link>
    </div>
  )
}