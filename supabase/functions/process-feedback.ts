import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced sentiment analysis with more comprehensive keyword detection
function analyzeSentiment(message: string): { sentiment: string; confidence: number; keywords: string[] } {
  const text = message.toLowerCase()
  
  // Positive keywords with weights
  const positiveKeywords = {
    'excellent': 3, 'amazing': 3, 'wonderful': 3, 'fantastic': 3, 'brilliant': 3,
    'outstanding': 3, 'superb': 3, 'terrific': 3, 'fabulous': 3, 'perfect': 3,
    'great': 2, 'good': 2, 'love': 2, 'like': 2, 'awesome': 2,
    'satisfied': 2, 'happy': 2, 'pleased': 2, 'impressed': 2, 'recommend': 2,
    'helpful': 1, 'useful': 1, 'nice': 1, 'fine': 1, 'okay': 1
  }
  
  // Negative keywords with weights
  const negativeKeywords = {
    'terrible': 3, 'awful': 3, 'horrible': 3, 'worst': 3, 'disgusting': 3,
    'hate': 3, 'dislike': 3, 'frustrated': 3, 'angry': 3, 'upset': 3,
    'bad': 2, 'poor': 2, 'disappointing': 2, 'annoyed': 2, 'broken': 2,
    'not working': 2, 'issue': 2, 'problem': 2, 'error': 2, 'bug': 2,
    'difficult': 1, 'confusing': 1, 'slow': 1, 'expensive': 1, 'waste': 1
  }
  
  // Urgent keywords
  const urgentKeywords = [
    'urgent', 'emergency', 'critical', 'immediate', 'asap',
    'refund', 'money back', 'chargeback', 'dispute',
    'broken', 'not working', 'crashed', 'down', 'failed',
    'security', 'hacked', 'breach', 'stolen', 'fraud'
  ]
  
  // Calculate sentiment scores
  let positiveScore = 0
  let negativeScore = 0
  const foundKeywords: string[] = []
  
  // Check positive keywords
  for (const [keyword, weight] of Object.entries(positiveKeywords)) {
    if (text.includes(keyword)) {
      positiveScore += weight
      foundKeywords.push(keyword)
    }
  }
  
  // Check negative keywords
  for (const [keyword, weight] of Object.entries(negativeKeywords)) {
    if (text.includes(keyword)) {
      negativeScore += weight
      foundKeywords.push(keyword)
    }
  }
  
  // Determine sentiment
  let sentiment = 'neutral'
  let confidence = 0.5
  
  if (positiveScore > negativeScore) {
    sentiment = 'positive'
    confidence = Math.min(0.9, 0.5 + (positiveScore - negativeScore) * 0.1)
  } else if (negativeScore > positiveScore) {
    sentiment = 'negative'
    confidence = Math.min(0.9, 0.5 + (negativeScore - positiveScore) * 0.1)
  }
  
  // Check for urgent keywords
  const hasUrgentKeywords = urgentKeywords.some(keyword => text.includes(keyword))
  
  return {
    sentiment,
    confidence: Math.round(confidence * 100) / 100,
    keywords: foundKeywords
  }
}

// Determine priority based on content and sentiment
function determinePriority(message: string, sentiment: string): string {
  const text = message.toLowerCase()
  
  // High priority indicators
  const highPriorityKeywords = [
    'urgent', 'emergency', 'critical', 'immediate', 'asap',
    'refund', 'money back', 'chargeback', 'dispute',
    'security', 'hacked', 'breach', 'stolen', 'fraud',
    'broken', 'not working', 'crashed', 'down', 'failed'
  ]
  
  // Medium priority indicators
  const mediumPriorityKeywords = [
    'bug', 'error', 'issue', 'problem', 'not working',
    'frustrated', 'angry', 'upset', 'disappointed',
    'slow', 'difficult', 'confusing', 'expensive'
  ]
  
  // Check for urgent keywords
  if (highPriorityKeywords.some(keyword => text.includes(keyword))) {
    return 'urgent'
  }
  
  // Check for high priority based on sentiment and keywords
  if (sentiment === 'negative' && mediumPriorityKeywords.some(keyword => text.includes(keyword))) {
    return 'high'
  }
  
  // Check for medium priority
  if (mediumPriorityKeywords.some(keyword => text.includes(keyword))) {
    return 'normal'
  }
  
  // Default priority
  return sentiment === 'negative' ? 'normal' : 'low'
}

// Create notification message based on type and feedback
function createNotificationMessage(
  type: string, 
  feedback: any, 
  sentiment: string, 
  priority: string
): string {
  const clientName = feedback.client_name || 'Anonymous'
  const messagePreview = feedback.message.length > 100 
    ? feedback.message.substring(0, 100) + '...' 
    : feedback.message
  
  switch (type) {
    case 'new_feedback':
      return `New feedback received from ${clientName}: "${messagePreview}"`
    
    case 'negative_sentiment':
      return `Negative feedback detected from ${clientName}. Priority: ${priority}. Sentiment confidence: ${sentiment.confidence * 100}%`
    
    case 'urgent_issue':
      return `🚨 URGENT: High-priority feedback from ${clientName} requires immediate attention. Priority: ${priority}`
    
    case 'high_priority':
      return `⚠️ High-priority feedback from ${clientName}. Priority: ${priority}`
    
    default:
      return `Feedback update from ${clientName}: ${messagePreview}`
  }
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

    console.log(`Processing feedback: ${feedback_id}`)

    // Get the feedback record
    const { data: feedback, error: feedbackError } = await supabaseClient
      .from('feedback')
      .select('*')
      .eq('id', feedback_id)
      .single()

    if (feedbackError || !feedback) {
      throw new Error(`Feedback not found: ${feedbackError?.message}`)
    }

    console.log(`Found feedback from: ${feedback.client_name || 'Anonymous'}`)

    // Analyze sentiment
    const sentimentAnalysis = analyzeSentiment(feedback.message)
    console.log(`Sentiment analysis: ${sentimentAnalysis.sentiment} (confidence: ${sentimentAnalysis.confidence})`)

    // Determine priority
    const priority = determinePriority(feedback.message, sentimentAnalysis.sentiment)
    console.log(`Priority determined: ${priority}`)

    // Update feedback with sentiment and priority
    const { error: updateError } = await supabaseClient
      .from('feedback')
      .update({ 
        sentiment: sentimentAnalysis.sentiment,
        priority: priority,
        metadata: {
          ...feedback.metadata,
          sentiment_confidence: sentimentAnalysis.confidence,
          sentiment_keywords: sentimentAnalysis.keywords,
          processed_at: new Date().toISOString()
        }
      })
      .eq('id', feedback_id)

    if (updateError) {
      console.error('Error updating feedback:', updateError)
      throw updateError
    }

    // Create notifications based on feedback characteristics
    const notifications = []

    // Always create a new feedback notification
    notifications.push({
      feedback_id: feedback_id,
      user_id: feedback.user_id,
      type: 'new_feedback',
      message: createNotificationMessage('new_feedback', feedback, sentimentAnalysis, priority),
      metadata: { 
        sentiment: sentimentAnalysis.sentiment, 
        priority: priority,
        confidence: sentimentAnalysis.confidence,
        keywords: sentimentAnalysis.keywords
      }
    })

    // Negative sentiment notification
    if (sentimentAnalysis.sentiment === 'negative' && sentimentAnalysis.confidence > 0.6) {
      notifications.push({
        feedback_id: feedback_id,
        user_id: feedback.user_id,
        type: 'negative_sentiment',
        message: createNotificationMessage('negative_sentiment', feedback, sentimentAnalysis, priority),
        metadata: { 
          sentiment: sentimentAnalysis.sentiment, 
          priority: priority,
          confidence: sentimentAnalysis.confidence,
          keywords: sentimentAnalysis.keywords
        }
      })
    }

    // Urgent issue notification
    if (priority === 'urgent') {
      notifications.push({
        feedback_id: feedback_id,
        user_id: feedback.user_id,
        type: 'urgent_issue',
        message: createNotificationMessage('urgent_issue', feedback, sentimentAnalysis, priority),
        metadata: { 
          sentiment: sentimentAnalysis.sentiment, 
          priority: priority,
          confidence: sentimentAnalysis.confidence,
          keywords: sentimentAnalysis.keywords
        }
      })
    }

    // High priority notification (but not urgent)
    if (priority === 'high' && priority !== 'urgent') {
      notifications.push({
        feedback_id: feedback_id,
        user_id: feedback.user_id,
        type: 'high_priority',
        message: createNotificationMessage('high_priority', feedback, sentimentAnalysis, priority),
        metadata: { 
          sentiment: sentimentAnalysis.sentiment, 
          priority: priority,
          confidence: sentimentAnalysis.confidence,
          keywords: sentimentAnalysis.keywords
        }
      })
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: notificationError } = await supabaseClient
        .from('feedback_notifications')
        .insert(notifications)

      if (notificationError) {
        console.error('Error creating notifications:', notificationError)
        // Don't throw here, as the main feedback processing was successful
      } else {
        console.log(`Created ${notifications.length} notifications`)
      }
    }

    // Check if email notifications are enabled
    const { data: settings } = await supabaseClient
      .from('feedback_settings')
      .select('auto_notifications')
      .eq('user_id', feedback.user_id)
      .single()

    if (settings?.auto_notifications) {
      // Log that email notification would be sent
      console.log(`Email notification would be sent for feedback: ${feedback_id}`)
      
      // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
      // Example with SendGrid:
      /*
      import sgMail from '@sendgrid/mail';
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      await sgMail.send({
        to: userEmail,
        from: 'noreply@yourdomain.com',
        subject: `New Feedback - ${priority.toUpperCase()}`,
        text: `New feedback received with ${sentimentAnalysis.sentiment} sentiment and ${priority} priority.`,
        html: `<p>New feedback received:</p><p><strong>Priority:</strong> ${priority}</p><p><strong>Sentiment:</strong> ${sentimentAnalysis.sentiment}</p><p><strong>Message:</strong> ${feedback.message}</p>`
      });
      */
    }

    // Log analytics event
    try {
      await supabaseClient
        .from('analytics_events')
        .insert({
          event_type: 'feedback_processed',
          event_data: {
            feedback_id: feedback_id,
            sentiment: sentimentAnalysis.sentiment,
            priority: priority,
            confidence: sentimentAnalysis.confidence,
            notifications_created: notifications.length,
            processing_time: new Date().toISOString()
          },
          user_id: feedback.user_id
        })
    } catch (analyticsError) {
      console.error('Error logging analytics:', analyticsError)
      // Don't throw here, as the main processing was successful
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        feedback_id: feedback_id,
        sentiment: sentimentAnalysis.sentiment,
        priority: priority,
        confidence: sentimentAnalysis.confidence,
        notifications_created: notifications.length,
        processing_time: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error processing feedback:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        feedback_id: req.body?.feedback_id || 'unknown'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})