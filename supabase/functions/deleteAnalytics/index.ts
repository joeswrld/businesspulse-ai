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
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse the request body
    const { analytics_id, delete_type = 'single' } = await req.json()

    // Validate request data
    if (!analytics_id && delete_type !== 'all') {
      return new Response(
        JSON.stringify({ error: 'Analytics ID is required for single deletion' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let deleteResult;

    if (delete_type === 'all') {
      // Delete all analytics for the user
      const { data, error } = await supabaseClient
        .from('analytics_history')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      deleteResult = { deleted_count: 'all', message: 'All analytics deleted successfully' };
    } else {
      // Delete specific analytics
      const { data, error } = await supabaseClient
        .from('analytics_history')
        .delete()
        .eq('id', analytics_id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Analytics not found or already deleted' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      deleteResult = { deleted_count: 1, message: 'Analytics deleted successfully' };
    }

    // Return success response
    return new Response(
      JSON.stringify(deleteResult),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in deleteAnalytics function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})