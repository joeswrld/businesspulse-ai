import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WidgetConfig {
  userId: string;
  position?: string;
  theme?: string;
  greeting?: string;
  primaryColor?: string;
  secondaryColor?: string;
  enabled?: boolean;
}

interface FeedbackSubmission {
  userId: string;
  clientName?: string;
  email?: string;
  message: string;
  category?: string;
  rating?: number;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    )

    const url = new URL(req.url)
    const path = url.pathname

    // Get widget configuration
    if (path === '/widget-config' && req.method === 'GET') {
      const userId = url.searchParams.get('userId')
      
      if (!userId) {
        throw new Error('User ID is required')
      }

      // Get user's widget settings
      const { data: settings, error } = await supabaseClient
        .from('feedback_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      // Return default config if no settings found
      const config = settings || {
        brand_colors: { primary: '#3b82f6', secondary: '#1e40af' },
        greeting_text: 'How was your experience?',
        button_placement: 'bottom-right',
        widget_enabled: true,
        auto_notifications: true
      }

      return new Response(JSON.stringify({
        success: true,
        config: {
          position: config.button_placement,
          greeting: config.greeting_text,
          primaryColor: config.brand_colors?.primary,
          secondaryColor: config.brand_colors?.secondary,
          enabled: config.widget_enabled
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Submit feedback
    if (path === '/submit-feedback' && req.method === 'POST') {
      const body: FeedbackSubmission = await req.json()
      
      if (!body.userId || !body.message) {
        throw new Error('User ID and message are required')
      }

      // Validate user exists
      const { data: user, error: userError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('id', body.userId)
        .single()

      if (userError || !user) {
        throw new Error('Invalid user ID')
      }

      // Insert feedback
      const { data: feedback, error } = await supabaseClient
        .from('feedback')
        .insert({
          user_id: body.userId,
          client_name: body.clientName,
          email: body.email,
          message: body.message,
          category: body.category,
          metadata: {
            rating: body.rating,
            submitted_at: new Date().toISOString(),
            ...body.metadata
          }
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Trigger feedback processing
      try {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-feedback`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ feedback_id: feedback.id })
        })
      } catch (processError) {
        console.error('Failed to trigger feedback processing:', processError)
      }

      return new Response(JSON.stringify({
        success: true,
        feedback_id: feedback.id,
        message: 'Feedback submitted successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Validate API key
    if (path === '/validate-key' && req.method === 'POST') {
      const { apiKey } = await req.json()
      
      if (!apiKey) {
        throw new Error('API key is required')
      }

      // In a real implementation, you'd validate against a stored API key
      // For now, we'll use a simple check
      const isValid = apiKey.startsWith('notex_') && apiKey.length > 20

      return new Response(JSON.stringify({
        success: true,
        valid: isValid,
        message: isValid ? 'API key is valid' : 'Invalid API key'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    return new Response(JSON.stringify({
      error: 'Endpoint not found'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    })

  } catch (error: any) {
    console.error('Widget API error:', error)
    
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})