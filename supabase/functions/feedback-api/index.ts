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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse form data
    const formData = await req.formData()
    const projectId = formData.get('project_id') as string
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const message = formData.get('message') as string

    // Validate required fields
    if (!projectId || !message) {
      return new Response(
        JSON.stringify({ error: 'Project ID and message are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate project_id exists
    const { data: settings, error: settingsError } = await supabase
      .from('feedback_settings')
      .select('*')
      .eq('project_id', projectId)
      .single()

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: 'Invalid project ID' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Insert feedback into database
    const { data: feedback, error: insertError } = await supabase
      .from('feedbacks')
      .insert({
        project_id: projectId,
        name: name || null,
        email: email || null,
        message: message,
        status: 'new'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting feedback:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to save feedback' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Send email notification if notify_email is set
    if (settings.notify_email) {
      try {
        const emailSubject = 'New Feedback Received - NoteX'
        const emailBody = `
Hi there,

You've received new feedback on your NoteX project:

From: ${name || 'Anonymous'}
Email: ${email || 'Not provided'}
Message: ${message}
Time: ${new Date().toLocaleString()}

View all feedback at: https://notex.com.ng/dashboard/feedback

Best regards,
NoteX Team
        `.trim()

        // Use Supabase Edge Function to send email
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: settings.notify_email,
            subject: emailSubject,
            html: emailBody.replace(/\n/g, '<br>')
          }
        })

        if (emailError) {
          console.error('Error sending email notification:', emailError)
        }
      } catch (emailError) {
        console.error('Error sending email notification:', emailError)
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Feedback submitted successfully!',
        data: feedback
      }),
      { 
        status: 200, 
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