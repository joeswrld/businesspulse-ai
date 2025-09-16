import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../integrations/supabase/client'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { 
  CreditCard, 
  Crown, 
  CheckCircle, 
  Calendar, 
  Zap, 
  BarChart3, 
  Users, 
  Shield,
  Loader2,
  ExternalLink
} from 'lucide-react'
import { useUserAccess } from './RouteProtection'

interface Subscription {
  id: string
  status: string
  plan_code: string
  current_period_start: string
  current_period_end: string
}

export const BillingPage: React.FC = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)
  const navigate = useNavigate()
  const { userAccess } = useUserAccess()

  useEffect(() => {
    fetchSubscriptionData()
  }, [])

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      // Get subscription data
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subscriptionError)
      } else {
        setSubscription(subscriptionData)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
    try {
      setProcessingPayment(true)
      setError('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      // Get user profile for Paystack customer creation
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        setError('Profile not found')
        return
      }

      // Initialize Paystack
      const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
      if (!paystackPublicKey) {
        setError('Paystack not configured')
        return
      }

      // Create Paystack customer
      const customerResponse = await fetch('/api/create-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: profile.email,
          first_name: profile.full_name?.split(' ')[0] || '',
          last_name: profile.full_name?.split(' ').slice(1).join(' ') || '',
        }),
      })

      if (!customerResponse.ok) {
        throw new Error('Failed to create customer')
      }

      const customerData = await customerResponse.json()

      // Update profile with Paystack customer ID
      await supabase
        .from('profiles')
        .update({ paystack_customer_id: customerData.customer_code })
        .eq('id', user.id)

      // Initialize Paystack payment
      const handler = (window as any).PaystackPop.setup({
        key: paystackPublicKey,
        email: profile.email,
        amount: 2900000, // $29 in kobo
        currency: 'NGN',
        ref: `notex_${Date.now()}`,
        customer: {
          email: profile.email,
          customer_code: customerData.customer_code,
        },
        plan: 'PLN_notex_business_monthly', // Replace with your actual plan code
        callback: async (response: any) => {
          try {
            // Verify payment with your backend
            const verifyResponse = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                reference: response.reference,
                customer_code: customerData.customer_code,
              }),
            })

            if (verifyResponse.ok) {
              // Refresh subscription data
              await fetchSubscriptionData()
              setError('')
            } else {
              setError('Payment verification failed')
            }
          } catch (error: any) {
            setError(error.message)
          } finally {
            setProcessingPayment(false)
          }
        },
        onClose: () => {
          setProcessingPayment(false)
        },
      })

      handler.openIframe()
    } catch (error: any) {
      setError(error.message)
      setProcessingPayment(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getDaysRemaining = (expiryDate: string) => {
    const now = new Date()
    const expiry = new Date(expiryDate)
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600 mt-2">Manage your NoteX subscription and billing information</p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Plan */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Current Plan</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userAccess?.is_subscription_active ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Business Plan</h3>
                        <p className="text-gray-600">Active subscription</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                    
                    {subscription && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Next billing: {formatDate(subscription.current_period_end)}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <CreditCard className="h-4 w-4" />
                          <span>Status: {subscription.status}</span>
                        </div>
                      </div>
                    )}

                    <Button variant="outline" className="w-full">
                      Manage Subscription
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {userAccess?.is_trial_active ? 'Free Trial' : 'No Active Plan'}
                        </h3>
                        <p className="text-gray-600">
                          {userAccess?.is_trial_active 
                            ? `${getDaysRemaining(userAccess.trial_expires_at || '')} days remaining`
                            : 'Trial expired'
                          }
                        </p>
                      </div>
                      <Badge className={userAccess?.is_trial_active ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}>
                        {userAccess?.is_trial_active ? 'Trial' : 'Expired'}
                      </Badge>
                    </div>

                    {userAccess?.is_trial_active && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 text-blue-800">
                          <Calendar className="h-5 w-5" />
                          <span className="font-medium">
                            Trial expires on {formatDate(userAccess.trial_expires_at || '')}
                          </span>
                        </div>
                      </div>
                    )}

                    <Button 
                      onClick={handleUpgrade}
                      disabled={processingPayment}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {processingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Crown className="mr-2 h-4 w-4" />
                      Upgrade to Business Plan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Business Plan Features */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="h-5 w-5" />
                  <span>Business Plan</span>
                </CardTitle>
                <CardDescription>$29/month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">Unlimited feedback collection</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">AI-powered insights</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">Advanced analytics</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">Team collaboration</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm">Priority support</span>
                  </div>
                </div>

                {!userAccess?.is_subscription_active && (
                  <Button 
                    onClick={handleUpgrade}
                    disabled={processingPayment}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {processingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Crown className="mr-2 h-4 w-4" />
                    Upgrade Now
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Support */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Contact Support
                </Button>
                <Button variant="outline" className="w-full">
                  View Documentation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}