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
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const body = await req.json()
    const { project_id, content, user_email, metadata = {} } = body

    // Validate required fields
    if (!project_id || !content) {
      return new Response(
        JSON.stringify({ error: 'project_id and content are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate project_id format
    if (!project_id.match(/^[a-z0-9\-]{4,30}$/)) {
      return new Response(
        JSON.stringify({ error: 'Invalid project_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate content length
    if (content.length < 3 || content.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Content must be between 3 and 5000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format if provided
    if (user_email && !user_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get project information
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id, name, is_active')
      .eq('project_id', project_id)
      .eq('is_active', true)
      .single()

    if (projectError || !project) {
      console.error('Project not found or inactive:', project_id)
      return new Response(
        JSON.stringify({ error: 'Project not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has access to submit feedback (trial or active subscription)
    const { data: accessCheck, error: accessError } = await supabase
      .rpc('check_user_access', { user_uuid: project.user_id })

    if (accessError || !accessCheck || accessCheck.length === 0) {
      console.error('Access check failed for user:', project.user_id)
      return new Response(
        JSON.stringify({ error: 'Access check failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userAccess = accessCheck[0]
    if (!userAccess.has_access) {
      return new Response(
        JSON.stringify({ error: 'Project owner does not have active access' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Perform basic sentiment analysis (simple keyword-based)
    const sentiment = analyzeSentiment(content)

    // Prepare metadata
    const feedbackMetadata = {
      ...metadata,
      userAgent: req.headers.get('user-agent') || '',
      referrer: req.headers.get('referer') || '',
      timestamp: new Date().toISOString(),
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    }

    // Insert feedback
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedbacks')
      .insert({
        project_id: project.id,
        user_email: user_email || null,
        content: content.trim(),
        sentiment: sentiment,
        metadata: feedbackMetadata
      })
      .select('id')
      .single()

    if (feedbackError) {
      console.error('Error inserting feedback:', feedbackError)
      return new Response(
        JSON.stringify({ error: 'Failed to submit feedback' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send notification to project owner (if email notifications are enabled)
    try {
      await sendNotificationToOwner(supabase, project, feedback.id, content, user_email)
    } catch (notificationError) {
      console.error('Notification error (non-critical):', notificationError)
      // Don't fail the request if notification fails
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        feedback_id: feedback.id,
        message: 'Feedback submitted successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Feedback submission error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function analyzeSentiment(text: string): string {
  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome',
    'love', 'like', 'perfect', 'best', 'outstanding', 'brilliant', 'superb',
    'happy', 'pleased', 'satisfied', 'impressed', 'delighted', 'thrilled'
  ]
  
  const negativeWords = [
    'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'dislike', 'disappointed',
    'angry', 'frustrated', 'annoyed', 'upset', 'sad', 'poor', 'broken', 'useless',
    'waste', 'regret', 'disgusted', 'furious', 'lousy', 'pathetic'
  ]

  const words = text.toLowerCase().split(/\s+/)
  let positiveCount = 0
  let negativeCount = 0

  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++
    if (negativeWords.includes(word)) negativeCount++
  })

  if (positiveCount > negativeCount) return 'positive'
  if (negativeCount > positiveCount) return 'negative'
  return 'neutral'
}

async function sendNotificationToOwner(supabase: any, project: any, feedbackId: string, content: string, userEmail?: string) {
  try {
    // Get project owner's email preferences
    const { data: ownerProfile, error: ownerError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', project.user_id)
      .single()

    if (ownerError || !ownerProfile) {
      console.error('Could not find project owner:', project.user_id)
      return
    }

    // For now, just log the notification
    // In a real implementation, you would send an email here
    console.log('Notification for project owner:', {
      ownerEmail: ownerProfile.email,
      ownerName: ownerProfile.full_name,
      projectName: project.name,
      feedbackId,
      content: content.substring(0, 100) + '...',
      userEmail
    })

    // TODO: Implement actual email sending using a service like SendGrid, Resend, etc.
    // This would involve:
    // 1. Getting the owner's email preferences
    // 2. Sending a formatted email with feedback details
    // 3. Including a link to view the feedback in the dashboard

  } catch (error) {
    console.error('Error sending notification:', error)
  }
}