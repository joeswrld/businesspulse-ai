import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

interface FeedbackEntry {
  id: string
  project_id: string
  user_email: string | null
  content: string
  sentiment: 'positive' | 'negative' | 'neutral' | null
  metadata: {
    form_type?: 'csat' | 'product'
    page_url?: string
    browser?: any
    rating?: number
    session_id?: string
  } | null
  created_at: string
}

export const useRealtimeFeedback = () => {
  const { user } = useAuth()
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load initial feedback
  const loadFeedback = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)

      // First, get the user's project settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('feedback_settings')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (settingsError) {
        console.error('Error loading project settings:', settingsError)
        setError('Failed to load project settings')
        return
      }

      if (!settingsData) {
        setFeedback([])
        return
      }

      // Then load feedback for that project
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback') // ✅ Fixed table name (singular)
        .select('id, project_id, user_email, content, sentiment, metadata, created_at')
        .eq('project_id', settingsData.id)
        .order('created_at', { ascending: false })

      if (feedbackError) {
        console.error('Error loading feedback:', feedbackError)
        setError('Failed to load feedback')
        return
      }

      setFeedback((feedbackData as unknown as FeedbackEntry[]) || [])
    } catch (err) {
      console.error('Error in loadFeedback:', err)
      setError('Failed to load feedback')
    } finally {
      setLoading(false)
    }
  }

  // Refresh function for manual refresh
  const refreshFeedback = async () => {
    await loadFeedback()
  }

  useEffect(() => {
    if (!user?.id) {
      setFeedback([])
      setLoading(false)
      return
    }

    // Load initial feedback
    loadFeedback()

    // Set up real-time subscription
    const setupRealtimeSubscription = async () => {
      try {
        // Get project IDs for real-time subscription
        const { data: settingsData, error: settingsError } = await supabase
          .from('feedback_settings')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (settingsError || !settingsData) {
          console.error('Error getting project for subscription:', settingsError)
          return
        }

        // Set up real-time subscription for feedback updates
        const channel = supabase
          .channel('feedback-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'feedback', // ✅ Fixed table name (singular)
              filter: `project_id=eq.${settingsData.id}`
            },
            (payload) => {
              console.log('Feedback change received:', payload)
              
              // Handle different types of changes
              if (payload.eventType === 'INSERT') {
                const newFeedback = payload.new as FeedbackEntry
                setFeedback(prev => [newFeedback, ...prev])
              } else if (payload.eventType === 'UPDATE') {
                const updatedFeedback = payload.new as FeedbackEntry
                setFeedback(prev => 
                  prev.map(item => 
                    item.id === updatedFeedback.id ? updatedFeedback : item
                  )
                )
              } else if (payload.eventType === 'DELETE') {
                const deletedId = payload.old.id
                setFeedback(prev => prev.filter(item => item.id !== deletedId))
              } else {
                // For any other changes, reload all feedback
                loadFeedback()
              }
            }
          )
          .subscribe()

        // Return cleanup function
        return () => {
          supabase.removeChannel(channel)
        }
      } catch (err) {
        console.error('Error setting up real-time subscription:', err)
      }
    }

    // ✅ FIXED: Now properly handling the async function in useEffect
    let cleanup: (() => void) | undefined

    setupRealtimeSubscription().then((cleanupFn) => {
      cleanup = cleanupFn
    })

    // Cleanup function
    return () => {
      if (cleanup) {
        cleanup()
      }
    }
  }, [user?.id])

  return {
    feedback,
    loading,
    error,
    refreshFeedback
  }
}
