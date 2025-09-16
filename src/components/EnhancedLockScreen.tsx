import React from 'react'
import { Lock, Crown, Calendar, CreditCard, Zap, Users, BarChart3, Shield, CheckCircle } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'

interface LockScreenProps {
  planStatus?: string
  trialExpiresAt?: string | null
  onUpgrade?: () => void
}

export const EnhancedLockScreen: React.FC<LockScreenProps> = ({
  planStatus = 'expired',
  trialExpiresAt,
  onUpgrade
}) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusMessage = () => {
    switch (planStatus) {
      case 'expired':
        return {
          title: 'Your trial has expired',
          description: 'Upgrade to Business Plan to continue using NoteX',
          icon: <Lock className="h-12 w-12 text-red-500" />,
          badge: 'Trial Expired'
        }
      case 'trialing':
        return {
          title: 'Trial Access',
          description: 'You are currently on a free trial',
          icon: <Calendar className="h-12 w-12 text-blue-500" />,
          badge: 'Free Trial'
        }
      default:
        return {
          title: 'Access Restricted',
          description: 'Please upgrade your plan to continue',
          icon: <Lock className="h-12 w-12 text-gray-500" />,
          badge: 'Access Restricted'
        }
    }
  }

  const status = getStatusMessage()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Card className="mb-8">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {status.icon}
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900">
              {status.title}
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              {status.description}
            </CardDescription>
            <Badge variant="outline" className="mt-2">
              {status.badge}
            </Badge>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {trialExpiresAt && planStatus === 'trialing' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-blue-800">
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">Trial expires on {formatDate(trialExpiresAt)}</span>
                </div>
              </div>
            )}

            {planStatus === 'expired' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-800">
                  <Lock className="h-5 w-5" />
                  <span className="font-medium">Trial expired on {formatDate(trialExpiresAt)}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 text-center">Business Plan includes:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                  <Zap className="h-6 w-6 text-yellow-500" />
                  <span className="text-sm font-medium">Unlimited feedback collection</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                  <BarChart3 className="h-6 w-6 text-green-500" />
                  <span className="text-sm font-medium">AI-powered insights and analytics</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                  <Users className="h-6 w-6 text-blue-500" />
                  <span className="text-sm font-medium">Team collaboration features</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
                  <Shield className="h-6 w-6 text-purple-500" />
                  <span className="text-sm font-medium">Priority support</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={onUpgrade}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <Crown className="h-5 w-5 mr-2" />
                Upgrade to Business Plan - $29/month
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = '/contact'}
              >
                Contact Support
              </Button>
            </div>

            <div className="text-center text-xs text-gray-500">
              Need help? Contact our support team for assistance.
            </div>
          </CardContent>
        </Card>

        {/* Additional benefits section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Unlimited Usage</h4>
              <p className="text-sm text-gray-600">Collect unlimited feedback without restrictions</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Advanced Analytics</h4>
              <p className="text-sm text-gray-600">Get detailed insights and reports</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Priority Support</h4>
              <p className="text-sm text-gray-600">Get help when you need it most</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}