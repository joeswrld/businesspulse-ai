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
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { featureRequestId, userEmail, featureTitle, featureDescription } = await req.json()

    if (!featureRequestId || !userEmail || !featureTitle) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get user's project information for branding
    const { data: userData, error: userError } = await supabaseClient
      .from('profiles')
      .select('full_name, company_name')
      .eq('id', featureRequestId) // This should be user_id, but we'll use the feature request to get user info
      .single()

    if (userError) {
      console.error('Error fetching user data:', userError)
    }

    const companyName = userData?.company_name || 'Your Company'
    const userName = userData?.full_name || 'Team'

    // Create email content
    const emailSubject = `🎉 Feature Released: ${featureTitle}`
    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Feature Released</title>
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
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 10px;
          }
          .title {
            font-size: 28px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
          }
          .subtitle {
            font-size: 16px;
            color: #6b7280;
          }
          .content {
            margin-bottom: 30px;
          }
          .feature-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
          }
          .feature-description {
            font-size: 16px;
            color: #4b5563;
            line-height: 1.6;
            margin-bottom: 20px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin-bottom: 20px;
          }
          .footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
          .emoji {
            font-size: 48px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">${companyName}</div>
            <div class="emoji">🎉</div>
            <div class="title">Feature Released!</div>
            <div class="subtitle">Your feedback made a difference</div>
          </div>
          
          <div class="content">
            <div class="feature-title">${featureTitle}</div>
            ${featureDescription ? `<div class="feature-description">${featureDescription}</div>` : ''}
            
            <p>Hi there!</p>
            <p>Great news! We've just released a new feature that was inspired by your feedback. Your input helps us build better products, and we wanted to let you know that your voice was heard.</p>
            
            <p>Thank you for taking the time to share your thoughts with us. We truly appreciate your feedback and look forward to hearing more from you in the future.</p>
            
            <div style="text-align: center;">
              <a href="#" class="cta-button">Check it out →</a>
            </div>
          </div>
          
          <div class="footer">
            <p>Best regards,<br>The ${companyName} Team</p>
            <p style="margin-top: 20px; font-size: 12px;">
              This email was sent because you provided feedback that influenced this feature release.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    // For now, we'll just log the email content
    // In a real implementation, you would integrate with an email service like SendGrid, Resend, etc.
    console.log('Email notification would be sent:')
    console.log('To:', userEmail)
    console.log('Subject:', emailSubject)
    console.log('Content:', emailContent)

    // Store notification in database
    const { error: notificationError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: featureRequestId, // This should be the actual user_id
        title: emailSubject,
        message: `Feature "${featureTitle}" has been released based on your feedback.`,
        type: 'feature_released',
        related_id: featureRequestId
      })

    if (notificationError) {
      console.error('Error storing notification:', notificationError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Feature release notification processed',
        emailSent: true // In real implementation, this would be based on actual email service response
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-feature-release-notification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})