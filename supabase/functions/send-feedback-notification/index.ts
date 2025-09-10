import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FeedbackNotificationRequest {
  feedback_id: string;
  user_id: string;
  project_id: string;
  feedback_data: {
    message: string;
    rating?: number;
    sender_name?: string;
    sender_email?: string;
    created_at: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📧 Starting feedback notification process...')

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const { feedback_id, user_id, project_id, feedback_data }: FeedbackNotificationRequest = await req.json()

    if (!feedback_id || !user_id || !project_id || !feedback_data) {
      throw new Error('Missing required parameters')
    }

    console.log('📧 Processing notification for feedback:', feedback_id)

    // Get user profile and project details
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name, company_name')
      .eq('user_id', user_id)
      .single()

    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError)
      throw new Error('Failed to fetch user profile')
    }

    const { data: project, error: projectError } = await supabaseClient
      .from('feedback_settings')
      .select('project_name, project_description, notification_email')
      .eq('user_id', user_id)
      .eq('project_id', project_id)
      .single()

    if (projectError) {
      console.error('❌ Error fetching project details:', projectError)
      throw new Error('Failed to fetch project details')
    }

    // Get user's notification preferences
    const { data: preferences, error: prefError } = await supabaseClient
      .from('notification_preferences')
      .select('email_notifications_enabled, instant_notifications')
      .eq('user_id', user_id)
      .single()

    // If no preferences found, create default ones
    if (prefError && prefError.code === 'PGRST116') {
      const { error: createPrefError } = await supabaseClient
        .from('notification_preferences')
        .insert({
          user_id,
          email_notifications_enabled: true,
          instant_notifications: true,
          created_at: new Date().toISOString()
        })

      if (createPrefError) {
        console.error('❌ Error creating notification preferences:', createPrefError)
      }
    }

    // Check if notifications are enabled
    const notificationsEnabled = preferences?.email_notifications_enabled !== false

    if (!notificationsEnabled) {
      console.log('📧 Email notifications disabled for user:', user_id)
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Notifications disabled for user',
          notification_sent: false 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Prepare email content
    const recipientEmail = project.notification_email || profile.email
    const recipientName = profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : profile.company_name || 'User'
    
    const projectName = project.project_name || 'Your Project'
    const feedbackMessage = feedback_data.message
    const rating = feedback_data.rating
    const senderName = feedback_data.sender_name || 'Anonymous'
    const senderEmail = feedback_data.sender_email || 'No email provided'
    const createdAt = new Date(feedback_data.created_at).toLocaleString()

    // Create email subject
    const subject = `New Feedback Received for ${projectName}`

    // Create email HTML content
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Feedback - ${projectName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .project-name {
            font-size: 20px;
            color: #1e293b;
            margin-bottom: 5px;
        }
        .feedback-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .feedback-message {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 15px;
            color: #374151;
        }
        .feedback-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            font-size: 14px;
            color: #6b7280;
        }
        .rating {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .stars {
            color: #fbbf24;
        }
        .cta-button {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
        .sender-info {
            background: #f1f5f9;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">NoteX</div>
            <div class="project-name">${projectName}</div>
            <p style="color: #6b7280; margin: 0;">New feedback received</p>
        </div>

        <div class="feedback-card">
            <div class="feedback-message">
                "${feedbackMessage}"
            </div>
            
            <div class="sender-info">
                <strong>From:</strong> ${senderName}<br>
                <strong>Email:</strong> ${senderEmail}<br>
                <strong>Received:</strong> ${createdAt}
                ${rating ? `<br><div class="rating"><strong>Rating:</strong> <span class="stars">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</span> (${rating}/5)</div>` : ''}
            </div>
        </div>

        <div style="text-align: center;">
            <a href="${Deno.env.get('SITE_URL') || 'https://notex.com.ng'}/dashboard" class="cta-button">
                View in Dashboard
            </a>
        </div>

        <div class="footer">
            <p>This is an automated notification from NoteX. You're receiving this because you have email notifications enabled for this project.</p>
            <p>
                <a href="${Deno.env.get('SITE_URL') || 'https://notex.com.ng'}/settings" style="color: #2563eb;">Manage notification preferences</a> | 
                <a href="${Deno.env.get('SITE_URL') || 'https://notex.com.ng'}/unsubscribe" style="color: #2563eb;">Unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>
    `

    // Create email text content
    const emailText = `
New Feedback Received for ${projectName}

Feedback: "${feedbackMessage}"

From: ${senderName} (${senderEmail})
Received: ${createdAt}
${rating ? `Rating: ${'★'.repeat(rating)}${'☆'.repeat(5-rating)} (${rating}/5)` : ''}

View in Dashboard: ${Deno.env.get('SITE_URL') || 'https://notex.com.ng'}/dashboard

---
This is an automated notification from NoteX.
Manage preferences: ${Deno.env.get('SITE_URL') || 'https://notex.com.ng'}/settings
    `

    // Send email using Supabase Edge Function
    const { data: emailData, error: emailError } = await supabaseClient.functions.invoke('send-email', {
      body: {
        to: recipientEmail,
        subject: subject,
        html: emailHtml,
        text: emailText,
        from: 'NoteX <noreply@notex.com.ng>'
      }
    })

    if (emailError) {
      console.error('❌ Error sending email:', emailError)
      throw new Error('Failed to send email notification')
    }

    console.log('✅ Email notification sent successfully to:', recipientEmail)

    // Log the notification in the database
    const { error: logError } = await supabaseClient
      .from('feedback_notifications')
      .insert({
        feedback_id,
        user_id,
        project_id,
        notification_type: 'email',
        recipient_email: recipientEmail,
        sent_at: new Date().toISOString(),
        status: 'sent'
      })

    if (logError) {
      console.error('❌ Error logging notification:', logError)
      // Don't throw error here as email was sent successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email notification sent successfully',
        notification_sent: true,
        recipient_email: recipientEmail
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('❌ Error in feedback notification:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        notification_sent: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})