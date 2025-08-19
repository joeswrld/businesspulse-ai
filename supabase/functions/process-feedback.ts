import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the request body
    const { feedback_id } = await req.json()

    if (!feedback_id) {
      throw new Error('Feedback ID is required')
    }

    // Get the feedback record
    const { data: feedback, error: feedbackError } = await supabaseClient
      .from('feedback')
      .select('*')
      .eq('id', feedback_id)
      .single()

    if (feedbackError || !feedback) {
      throw new Error('Feedback not found')
    }

    // Analyze sentiment using a simple keyword-based approach
    // In production, you'd want to use a proper sentiment analysis API like Google Cloud Natural Language
    let sentiment = 'neutral'
    const message = feedback.message.toLowerCase()
    
    const positiveWords = ['great', 'good', 'excellent', 'amazing', 'wonderful', 'love', 'like', 'perfect', 'awesome', 'fantastic', 'brilliant', 'outstanding', 'superb', 'terrific', 'fabulous']
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'worst', 'poor', 'disappointing', 'frustrated', 'angry', 'upset', 'annoyed', 'broken', 'not working', 'issue', 'problem']
    
    const positiveCount = positiveWords.filter(word => message.includes(word)).length
    const negativeCount = negativeWords.filter(word => message.includes(word)).length
    
    if (positiveCount > negativeCount) {
      sentiment = 'positive'
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative'
    }

    // Update feedback with sentiment
    const { error: updateError } = await supabaseClient
      .from('feedback')
      .update({ sentiment })
      .eq('id', feedback_id)

    if (updateError) {
      throw updateError
    }

    // Create notifications based on feedback characteristics
    const notifications = []

    // New feedback notification
    notifications.push({
      feedback_id: feedback_id,
      user_id: feedback.user_id,
      type: 'new_feedback',
      message: `New feedback received from ${feedback.client_name || 'Anonymous'}: "${feedback.message.substring(0, 100)}${feedback.message.length > 100 ? '...' : ''}"`,
      metadata: { sentiment, priority: feedback.priority }
    })

    // Negative sentiment notification
    if (sentiment === 'negative') {
      notifications.push({
        feedback_id: feedback_id,
        user_id: feedback.user_id,
        type: 'negative_sentiment',
        message: `Negative feedback detected from ${feedback.client_name || 'Anonymous'}. Priority: ${feedback.priority}`,
        metadata: { sentiment, priority: feedback.priority }
      })
    }

    // Urgent issue notification
    if (feedback.priority === 'urgent') {
      notifications.push({
        feedback_id: feedback_id,
        user_id: feedback.user_id,
        type: 'urgent_issue',
        message: `URGENT: High-priority feedback from ${feedback.client_name || 'Anonymous'} requires immediate attention.`,
        metadata: { sentiment, priority: feedback.priority }
      })
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: notificationError } = await supabaseClient
        .from('feedback_notifications')
        .insert(notifications)

      if (notificationError) {
        console.error('Error creating notifications:', notificationError)
      }
    }

    // Send email notifications if enabled
    const { data: settings } = await supabaseClient
      .from('feedback_settings')
      .select('auto_notifications')
      .eq('user_id', feedback.user_id)
      .single()

    if (settings?.auto_notifications) {
      // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
      // For now, we'll just log the notification
      console.log('Email notification would be sent for feedback:', feedback_id)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentiment,
        notifications_created: notifications.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error processing feedback:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})