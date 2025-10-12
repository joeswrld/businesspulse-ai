import { useState, useEffect } from 'react'
import { supabase, Profile } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface SubscriptionStatus {
  hasAccess: boolean
  status: string
  daysRemaining: number
  isTrialActive: boolean
  isPaidActive: boolean
  isLoading: boolean
  error?: string
}

export const useSubscriptionStatus = (): SubscriptionStatus => {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }

    // Fetch initial profile
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
          setError(error.message)
          return
        }

        setProfile(data)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError('Failed to fetch subscription status')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()

    // Set up real-time subscription
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('Profile updated:', payload.new)
          setProfile(payload.new as Profile)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  if (!user || isLoading) {
    return {
      hasAccess: false,
      status: 'loading',
      daysRemaining: 0,
      isTrialActive: false,
      isPaidActive: false,
      isLoading: true,
      error
    }
  }

  if (!profile) {
    return {
      hasAccess: false,
      status: 'error',
      daysRemaining: 0,
      isTrialActive: false,
      isPaidActive: false,
      isLoading: false,
      error: error || 'Profile not found'
    }
  }

  const now = new Date()
  const trialEndDate = new Date(profile.trial_end_date)
  const isTrialActive = profile.subscription_status === 'trial' && now < trialEndDate
  const isPaidActive = profile.subscription_status === 'active'
  const hasAccess = isTrialActive || isPaidActive

  // Calculate days remaining
  let daysRemaining = 0
  if (isTrialActive) {
    const diffTime = trialEndDate.getTime() - now.getTime()
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  return {
    hasAccess,
    status: profile.subscription_status,
    daysRemaining,
    isTrialActive,
    isPaidActive,
    isLoading: false,
    error
  }
}