import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
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
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get request body
    const { invitation_id } = await req.json()

    if (!invitation_id) {
      throw new Error('Invitation ID is required')
    }

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('team_invitations')
      .select(`
        *,
        teams (
          id,
          name,
          description
        ),
        inviter:auth.users!team_invitations_inviter_id_fkey (
          email,
          raw_user_meta_data
        )
      `)
      .eq('id', invitation_id)
      .single()

    if (invitationError || !invitation) {
      throw new Error('Invitation not found')
    }

    // Get inviter name
    const inviterName = invitation.inviter?.raw_user_meta_data?.full_name || 
                       invitation.inviter?.email?.split('@')[0] || 
                       'Team Member'

    // Create invitation URL
    const baseUrl = Deno.env.get('SITE_URL') || 'http://localhost:3000'
    const invitationUrl = `${baseUrl}/teams/invite/${invitation.token}`

    // Email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team Invitation - NoteX</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .button:hover { background: #5a6fd8; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .team-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .personal-message { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 You're Invited to Join NoteX!</h1>
            <p>${inviterName} has invited you to collaborate on their team</p>
          </div>
          
          <div class="content">
            <div class="team-info">
              <h2>${invitation.teams.name}</h2>
              <p><strong>Role:</strong> ${invitation.role}</p>
              ${invitation.teams.description ? `<p><strong>Description:</strong> ${invitation.teams.description}</p>` : ''}
            </div>
            
            ${invitation.personal_message ? `
              <div class="personal-message">
                <h3>Personal Message from ${inviterName}:</h3>
                <p>"${invitation.personal_message}"</p>
              </div>
            ` : ''}
            
            <p>Join this team to start collaborating on projects, sharing insights, and building amazing things together!</p>
            
            <div style="text-align: center;">
              <a href="${invitationUrl}" class="button">Accept Invitation</a>
            </div>
            
            <p style="text-align: center; margin-top: 20px;">
              <small>This invitation expires on ${new Date(invitation.expires_at).toLocaleDateString()}</small>
            </p>
            
            <div class="footer">
              <p>If you have any questions, please contact ${inviterName} at ${invitation.inviter.email}</p>
              <p>© 2024 NoteX. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `

    const emailText = `
Team Invitation - NoteX

${inviterName} has invited you to join their team on NoteX!

Team: ${invitation.teams.name}
Role: ${invitation.role}
${invitation.teams.description ? `Description: ${invitation.teams.description}` : ''}

${invitation.personal_message ? `Personal Message from ${inviterName}: "${invitation.personal_message}"` : ''}

Accept this invitation by clicking the link below:
${invitationUrl}

This invitation expires on ${new Date(invitation.expires_at).toLocaleDateString()}

If you have any questions, please contact ${inviterName} at ${invitation.inviter.email}

© 2024 NoteX. All rights reserved.
    `

    // Send email using Supabase's built-in email service
    const { data: emailData, error: emailError } = await supabaseClient
      .from('emails')
      .insert({
        to: invitation.email,
        subject: `You're invited to join ${invitation.teams.name} on NoteX`,
        html_content: emailHtml,
        text_content: emailText,
        from: 'noreply@notex.com',
        metadata: {
          invitation_id: invitation.id,
          team_id: invitation.teams.id,
          inviter_id: invitation.inviter_id
        }
      })

    if (emailError) {
      console.error('Email sending error:', emailError)
      throw new Error('Failed to send email')
    }

    // Update invitation status to indicate email was sent
    await supabaseClient
      .from('team_invitations')
      .update({ 
        updated_at: new Date().toISOString(),
        metadata: { email_sent_at: new Date().toISOString() }
      })
      .eq('id', invitation_id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitation email sent successfully',
        invitation_id: invitation_id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})