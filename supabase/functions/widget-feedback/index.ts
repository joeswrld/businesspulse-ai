import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from "npm:resend@6.1.2"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    // Create Supabase clients
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') || '' },
        },
      }
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Define validation schema
    const feedbackSchema = z.object({
      project_id: z.string().uuid(),
      form_type: z.enum(['customer_satisfaction', 'product_feedback']),
      message: z.string().trim().min(1).max(5000),
      rating: z.number().int().min(1).max(5).optional(),
      metadata: z.object({
        email: z.string().email().max(255).optional(),
        name: z.string().max(100).optional()
      }).optional()
    })

    // Parse and validate request body
    const body = feedbackSchema.parse(await req.json())
    const { project_id, form_type, message, rating, metadata } = body

    // Rate limiting check
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
    const { count } = await supabaseAdmin
      .from('feedback')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project_id)
      .gte('created_at', oneHourAgo)

    if (count && count > 100) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate required fields (redundant but kept for backwards compatibility)
    if (!project_id || !form_type || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: project_id, form_type, message' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate form_type
    if (!['customer_satisfaction', 'product_feedback'].includes(form_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid form_type. Must be customer_satisfaction or product_feedback' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate rating for customer satisfaction
    if (form_type === 'customer_satisfaction' && (!rating || rating < 1 || rating > 5)) {
      return new Response(
        JSON.stringify({ error: 'Rating is required for customer_satisfaction and must be between 1-5' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if project exists and get user_id
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('user_id')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Sanitize message
    const sanitizedMessage = message.replace(/<[^>]*>/g, '')

    // Prepare feedback data
    const feedbackData = {
      project_id,
      user_id: project.user_id,
      form_type,
      message: sanitizedMessage,
      rating: form_type === 'customer_satisfaction' ? rating : null,
      metadata: {
        ...(metadata || {}),
        submitted_at: new Date().toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      }
    }

    // Insert feedback
    const { data: feedback, error: insertError } = await supabaseClient
      .from('feedback')
      .insert(feedbackData)
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting feedback:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to submit feedback' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log the submission for analytics
    console.log(`Feedback submitted: ${form_type} for project ${project_id}`)

    // Attempt to send email notification to project owner (non-blocking)
    try {
      const resend = new Resend(Deno.env.get('RESEND_API_KEY') || '')

      // Fetch recipient email and brand info
      const [{ data: profile }, { data: settings }] = await Promise.all([
        supabaseClient
          .from('profiles')
          .select('email, full_name, company_name')
          .eq('user_id', project.user_id)
          .single(),
        supabaseClient
          .from('feedback_settings')
          .select('business_name')
          .eq('project_id', project_id)
          .single(),
      ])

      const recipientEmail = profile?.email
      if (recipientEmail) {
        const businessName = settings?.business_name || profile?.company_name || 'NoteX'
        const feedbackUrl = `${Deno.env.get('NEXT_PUBLIC_APP_URL') || 'https://notex.com.ng'}/feedback`
        const subject = `New ${form_type === 'customer_satisfaction' ? 'CSAT' : 'Product'} feedback received`

        const ratingText = form_type === 'customer_satisfaction' && rating ? `\nRating: ${'★'.repeat(rating)} (${rating}/5)` : ''
        const text = `Hello,\n\nYou just received new ${form_type.replace('_', ' ')} on ${businessName}.\n${ratingText}\nMessage: ${sanitizedMessage}\n\nView in dashboard: ${feedbackUrl}\n\nFeedback ID: ${feedback.id}\nReceived: ${new Date().toISOString()}`

        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;">
            <h2 style="margin:0 0 8px 0;">New ${form_type === 'customer_satisfaction' ? 'Customer Satisfaction' : 'Product'} Feedback</h2>
            <p style="margin:0 0 12px 0;color:#555">${businessName}</p>
            ${form_type === 'customer_satisfaction' && rating ? `<p style="margin:0 0 12px 0;font-size:16px;">Rating: ${'⭐'.repeat(rating)}</p>` : ''}
            <div style="background:#f8f9fa;border-left:4px solid #6366f1;padding:12px;border-radius:6px;margin-bottom:12px;">
              <div style="color:#111;white-space:pre-wrap;">${sanitizedMessage.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
            </div>
            <p style="margin:0 0 16px 0;color:#666;font-size:12px;">Feedback ID: ${feedback.id}</p>
            <a href="${feedbackUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">View in Dashboard →</a>
          </div>
        `

        const { error: emailError } = await resend.emails.send({
          from: 'NoteX <noreply@notex.com.ng>',
          to: [recipientEmail],
          subject,
          text,
          html,
        })

        if (emailError) {
          console.error('Failed to send feedback email:', emailError)
        } else {
          console.log(`Email notification sent to ${recipientEmail} for feedback ${feedback.id}`)
        }
      } else {
        console.warn('No recipient email found for project owner; skipping email notification')
      }
    } catch (emailErr) {
      console.error('Email notification error:', emailErr)
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        feedback_id: feedback.id,
        message: 'Feedback submitted successfully' 
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})