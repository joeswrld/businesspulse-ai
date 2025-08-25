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

    // Log request details for debugging
    console.log('Feedback API called:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    })

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
      .order('created_at', { ascending: false })
      .limit(1)

    if (settingsError) {
      console.error('Error checking project_id:', settingsError)
      return new Response(
        JSON.stringify({ error: 'Database error while validating project ID' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!settings || settings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid project ID' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const projectSettings = settings[0];

    // Check usage limits before allowing feedback submission
    const userId = projectSettings.user_id;
    
    // Get user's subscription and plan
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      console.error('Error checking subscription:', subscriptionError);
      return new Response(
        JSON.stringify({ error: 'Database error while checking subscription' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Determine user's plan
    let userPlan = 'free';
    if (subscription) {
      if (subscription.plan_id.includes('pro')) {
        userPlan = 'pro';
      } else if (subscription.plan_id.includes('business')) {
        userPlan = 'business';
      }
    }

    // Get current month's feedback count
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { count: currentMonthCount, error: countError } = await supabase
      .from('feedbacks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .gte('created_at', startOfMonth.toISOString())
      .lte('created_at', endOfMonth.toISOString());

    if (countError) {
      console.error('Error counting monthly feedback:', countError);
      return new Response(
        JSON.stringify({ error: 'Database error while checking usage limits' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user has reached their limit
    const monthlyLimit = userPlan === 'free' ? 50 : userPlan === 'pro' ? 200 : -1; // -1 means unlimited
    const currentCount = currentMonthCount || 0;

    if (monthlyLimit !== -1 && currentCount >= monthlyLimit) {
      // User has reached their limit
      let upgradeMessage = '';
      
      if (userPlan === 'free') {
        upgradeMessage = `Feedback entries limit reached (${currentCount}/${monthlyLimit}). Upgrade to Pro Plan to get 200 feedback submissions per month.`;
      } else if (userPlan === 'pro') {
        upgradeMessage = `Feedback entries limit reached (${currentCount}/${monthlyLimit}). Upgrade to Business Plan for unlimited feedback submissions.`;
      }

      return new Response(
        JSON.stringify({ 
          error: 'Usage limit reached',
          message: upgradeMessage,
          currentUsage: currentCount,
          limit: monthlyLimit,
          plan: userPlan,
          needsUpgrade: true,
          upgradeUrl: 'https://notex.com.ng/billing'
        }),
        { 
          status: 429, // Too Many Requests
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
    if (projectSettings.notify_email) {
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