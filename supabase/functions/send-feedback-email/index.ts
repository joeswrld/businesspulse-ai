import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FeedbackData {
  feedback_id: string;
  user_id: string;
  project_id: string;
  message: string;
  name?: string;
  email?: string;
  timestamp: string;
}

interface ResendResponse {
  id: string;
  from: string;
  to: string[];
  created_at: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // Get request body
    let body: FeedbackData;
    try {
      body = await req.json();
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { feedback_id, user_id, message, name, email, project_id, timestamp } = body;

    // Validate required fields
    if (!feedback_id || !user_id || !message) {
      console.error('Missing required fields:', { feedback_id, user_id, message });
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          received: { feedback_id, user_id, message },
          required: ['feedback_id', 'user_id', 'message']
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      console.error('Missing environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error - missing environment variables' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user email from auth.users
    console.log(`Looking up user email for user_id: ${user_id}`)
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(user_id)
    
    if (userError || !user) {
      console.error('User lookup error:', userError)
      return new Response(
        JSON.stringify({ 
          error: 'User not found', 
          details: userError?.message || 'User does not exist',
          user_id 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userEmail = user.user.email
    if (!userEmail) {
      console.error('User has no email address')
      return new Response(
        JSON.stringify({ 
          error: 'User has no email address',
          user_id 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found user email: ${userEmail}`)

    // Prepare email content
    const feedbackDate = new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Feedback Received</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .feedback-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .meta { background: #e9ecef; padding: 15px; border-radius: 6px; margin: 15px 0; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📩 New Feedback Received</h1>
              <p>You have received new feedback on your NoteX project</p>
            </div>
            
            <div class="content">
              <div class="feedback-box">
                <h3>Feedback Message:</h3>
                <p style="font-size: 16px; line-height: 1.6; margin: 15px 0;">${message}</p>
              </div>
              
              <div class="meta">
                <p><strong>📅 Date:</strong> ${feedbackDate}</p>
                <p><strong>🆔 Feedback ID:</strong> ${feedback_id}</p>
                ${name ? `<p><strong>👤 From:</strong> ${name}</p>` : ''}
                ${email ? `<p><strong>📧 Email:</strong> ${email}</p>` : ''}
                <p><strong>🏷️ Project ID:</strong> ${project_id}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${supabaseUrl.replace('/rest/v1', '')}/app/feedback" class="button">
                  View in Dashboard
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from NoteX</p>
              <p>If you no longer wish to receive these notifications, please update your settings.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
New Feedback Received

You have received new feedback on your NoteX project:

Message: ${message}

Details:
- Date: ${feedbackDate}
- Feedback ID: ${feedback_id}
${name ? `- From: ${name}` : ''}
${email ? `- Email: ${email}` : ''}
- Project ID: ${project_id}

View in Dashboard: ${supabaseUrl.replace('/rest/v1', '')}/app/feedback

---
This is an automated notification from NoteX
    `.trim();

    // Send email via Resend API
    console.log(`Sending email to: ${userEmail}`)
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NoteX <noreply@notex.com.ng>',
        to: [userEmail],
        subject: '📩 New Feedback Received',
        html: emailHtml,
        text: emailText,
      }),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      console.error('Resend API error:', resendResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email', 
          details: errorText,
          status: resendResponse.status 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const resendData: ResendResponse = await resendResponse.json()
    console.log('Email sent successfully:', resendData.id)

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        data: {
          feedback_id,
          user_id,
          user_email: userEmail,
          resend_id: resendData.id,
          sent_at: new Date().toISOString()
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Email notification error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})