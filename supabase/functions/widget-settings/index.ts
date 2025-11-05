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
    // Use service role for safe, read-only access to public widget settings
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get project ID from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const projectId = pathParts[pathParts.length - 1]

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Project ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch a safe subset of widget settings for the project (public fields only)
    const { data: settings, error } = await supabaseAdmin
      .from('feedback_settings')
      .select('project_id, widget_title, widget_color, greeting_text, customer_satisfaction_enabled, product_feedback_enabled, business_name, logo_url')
      .eq('project_id', projectId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching widget settings:', error)
    }

    // If no settings found, return sensible defaults so public forms still render
    const responsePayload = settings ?? {
      project_id: projectId,
      customer_satisfaction_enabled: true,
      product_feedback_enabled: true,
      widget_title: 'We love your feedback!',
      widget_color: '#3B82F6',
      greeting_text: 'Help us improve by sharing your thoughts',
      business_name: null,
      logo_url: null,
    }

    // Return the settings
    return new Response(
      JSON.stringify(responsePayload),
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
