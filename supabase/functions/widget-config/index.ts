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

    // Get project_id from query parameters
    const url = new URL(req.url)
    const projectId = url.searchParams.get('project_id')

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'project_id parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate project_id format
    if (!projectId.match(/^[a-z0-9\-]{4,30}$/)) {
      return new Response(
        JSON.stringify({ error: 'Invalid project_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get project configuration
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, settings, is_active')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .single()

    if (projectError || !project) {
      console.error('Project not found or inactive:', projectId)
      return new Response(
        JSON.stringify({ error: 'Project not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract safe settings for public consumption
    const safeSettings = {
      // Widget appearance
      theme: project.settings?.theme || 'light',
      primaryColor: project.settings?.primaryColor || '#3b82f6',
      textColor: project.settings?.textColor || '#1f2937',
      backgroundColor: project.settings?.backgroundColor || '#ffffff',
      
      // Widget text
      title: project.settings?.title || 'Share Your Feedback',
      placeholder: project.settings?.placeholder || 'Tell us what you think...',
      submitText: project.settings?.submitText || 'Submit',
      thankYouMessage: project.settings?.thankYouMessage || 'Thank you for your feedback!',
      
      // Widget behavior
      position: project.settings?.position || 'bottom-right',
      showEmailField: project.settings?.showEmailField !== false,
      requireEmail: project.settings?.requireEmail || false,
      
      // Widget branding
      showLogo: project.settings?.showLogo || false,
      logoUrl: project.settings?.logoUrl || null,
      companyName: project.settings?.companyName || project.name,
      
      // Widget features
      allowFileUpload: project.settings?.allowFileUpload || false,
      maxFileSize: project.settings?.maxFileSize || 5, // MB
      allowedFileTypes: project.settings?.allowedFileTypes || ['jpg', 'jpeg', 'png', 'pdf'],
      
      // Widget styling
      borderRadius: project.settings?.borderRadius || '8px',
      fontSize: project.settings?.fontSize || '14px',
      fontFamily: project.settings?.fontFamily || 'system-ui, -apple-system, sans-serif',
      
      // Widget behavior
      autoOpen: project.settings?.autoOpen || false,
      autoOpenDelay: project.settings?.autoOpenDelay || 5000, // ms
      closeOnSubmit: project.settings?.closeOnSubmit !== false,
      
      // Analytics
      trackEvents: project.settings?.trackEvents !== false,
      
      // Project metadata
      projectId: projectId,
      projectName: project.name
    }

    // Return the safe configuration
    return new Response(
      JSON.stringify({
        success: true,
        config: safeSettings
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        } 
      }
    )

  } catch (error) {
    console.error('Widget config error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})