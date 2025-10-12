import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, CreditCard, AlertCircle, Clock, Star } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// Paystack configuration
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
const PAYSTACK_PLAN_CODE = import.meta.env.VITE_PAYSTACK_PLAN_CODE

// Declare PaystackPop on window object
declare global {
  interface Window {
    PaystackPop: any
  }
}

export const BillingPage = () => {
  const { user } = useAuth()
  const { status, daysRemaining, isTrialActive, isPaidActive } = useSubscriptionStatus()
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Failed to load profile')
    }
  }

  const handleUpgrade = async () => {
    if (!user || !PAYSTACK_PUBLIC_KEY || !PAYSTACK_PLAN_CODE) {
      toast.error('Payment configuration missing')
      return
    }

    setIsLoading(true)

    try {
      // Load Paystack script if not already loaded
      if (!window.PaystackPop) {
        const script = document.createElement('script')
        script.src = 'https://js.paystack.co/v1/inline.js'
        script.onload = () => {
          initializePaystack()
        }
        document.head.appendChild(script)
      } else {
        initializePaystack()
      }
    } catch (error) {
      console.error('Error initializing payment:', error)
      toast.error('Failed to initialize payment')
      setIsLoading(false)
    }
  }

  const initializePaystack = () => {
    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: user?.email || '',
      amount: 500000, // ₦5,000 in kobo
      currency: 'NGN',
      plan: PAYSTACK_PLAN_CODE,
      ref: `${user?.id}_${Date.now()}`,
      
      callback: async (response: any) => {
        console.log('Payment successful:', response)
        
        try {
          // Update subscription status in Supabase
          const { error } = await supabase
            .from('profiles')
            .update({
              subscription_status: 'active',
              plan_type: 'pro',
              paystack_customer_code: response.customer?.customer_code,
              paystack_authorization_code: response.authorization?.authorization_code
            })
            .eq('id', user?.id)

          if (error) throw error

          // Log payment success
          await supabase
            .from('payment_logs')
            .insert({
              user_id: user?.id,
              event_type: 'charge.success',
              paystack_reference: response.reference,
              amount: 5000.00,
              status: 'success',
              metadata: response
            })

          toast.success('Payment successful! Welcome to Pro!')
          navigate('/dashboard')
        } catch (error) {
          console.error('Error updating subscription:', error)
          toast.error('Payment successful but failed to update account. Please contact support.')
        }
      },
      
      onClose: () => {
        console.log('Payment cancelled')
        setIsLoading(false)
      }
    })

    handler.openIframe()
  }

  const getStatusInfo = () => {
    if (isPaidActive) {
      return {
        title: 'Pro Plan Active',
        description: 'You have full access to all NoteX features',
        icon: Check,
        color: 'green',
        showUpgrade: false
      }
    }

    if (status === 'failed') {
      return {
        title: 'Payment Failed',
        description: 'There was an issue with your payment. Please try again.',
        icon: AlertCircle,
        color: 'red',
        showUpgrade: true
      }
    }

    if (status === 'cancelled') {
      return {
        title: 'Subscription Cancelled',
        description: 'Your subscription has been cancelled. Reactivate to continue.',
        icon: AlertCircle,
        color: 'red',
        showUpgrade: true
      }
    }

    if (isTrialActive) {
      return {
        title: 'Free Trial Active',
        description: `You have ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left in your trial`,
        icon: Clock,
        color: 'blue',
        showUpgrade: true
      }
    }

    return {
      title: 'Trial Expired',
      description: 'Your free trial has ended. Upgrade to continue using NoteX.',
      icon: AlertCircle,
      color: 'red',
      showUpgrade: true
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Billing & Subscription</h1>
          <p className="mt-2 text-lg text-gray-600">
            Manage your NoteX subscription and billing
          </p>
        </div>

        <div className="mt-12">
          {/* Status Card */}
          <div className={`bg-${statusInfo.color}-50 border border-${statusInfo.color}-200 rounded-lg p-6 mb-8`}>
            <div className="flex items-center">
              <StatusIcon className={`h-8 w-8 text-${statusInfo.color}-600`} />
              <div className="ml-4">
                <h3 className={`text-lg font-medium text-${statusInfo.color}-900`}>
                  {statusInfo.title}
                </h3>
                <p className={`text-sm text-${statusInfo.color}-700`}>
                  {statusInfo.description}
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Trial Card */}
            <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900">Free Trial</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">₦0</span>
                  <span className="text-lg text-gray-500">/8 days</span>
                </div>
                <p className="mt-4 text-gray-600">
                  Full access to all features for 8 days
                </p>
              </div>

              <div className="mt-8">
                <ul className="space-y-4">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="ml-3 text-gray-700">Unlimited feedback collection</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="ml-3 text-gray-700">AI-powered insights</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="ml-3 text-gray-700">Real-time notifications</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="ml-3 text-gray-700">Basic analytics</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <button
                  disabled
                  className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-md font-medium cursor-not-allowed"
                >
                  Current Plan
                </button>
              </div>
            </div>

            {/* Pro Plan Card */}
            <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-primary-500 relative">
              <div className="absolute top-0 right-0 bg-primary-500 text-white px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-medium">
                Most Popular
              </div>
              
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900">Pro Plan</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-primary-600">₦5,000</span>
                  <span className="text-lg text-gray-500">/month</span>
                </div>
                <p className="mt-4 text-gray-600">
                  Everything in Free Trial, plus advanced features
                </p>
              </div>

              <div className="mt-8">
                <ul className="space-y-4">
                  <li className="flex items-center">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="ml-3 text-gray-700">Everything in Free Trial</span>
                  </li>
                  <li className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="ml-3 text-gray-700">Team collaboration</span>
                  </li>
                  <li className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="ml-3 text-gray-700">Advanced analytics</span>
                  </li>
                  <li className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="ml-3 text-gray-700">Priority support</span>
                  </li>
                  <li className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="ml-3 text-gray-700">Custom branding</span>
                  </li>
                  <li className="flex items-center">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="ml-3 text-gray-700">Export & API access</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                {statusInfo.showUpgrade ? (
                  <button
                    onClick={handleUpgrade}
                    disabled={isLoading}
                    className="w-full bg-primary-600 text-white py-2 px-4 rounded-md font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5 mr-2" />
                        Upgrade to Pro
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md font-medium cursor-not-allowed flex items-center justify-center"
                  >
                    <Check className="h-5 w-5 mr-2" />
                    Active Plan
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              All plans include 24/7 support and regular updates. Cancel anytime.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Questions? Contact us at{' '}
              <a href="mailto:support@notex.com" className="text-primary-600 hover:text-primary-500">
                support@notex.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}