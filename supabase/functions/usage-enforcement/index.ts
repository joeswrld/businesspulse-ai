import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UsageRequest {
  action: 'check' | 'increment' | 'reset' | 'enforce';
  user_id: string;
  feature?: 'feedback' | 'insights' | 'analytics' | 'reports';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, user_id, feature }: UsageRequest = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'check': {
        if (!feature) {
          return new Response(
            JSON.stringify({ error: 'feature is required for check action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: canUse, error } = await supabase.rpc('can_use_feature', {
          user_uuid: user_id,
          feature_name: feature
        });

        if (error) {
          console.error('Error checking usage:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to check usage' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ can_use: canUse, feature, user_id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'increment': {
        if (!feature) {
          return new Response(
            JSON.stringify({ error: 'feature is required for increment action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: result, error } = await supabase.rpc('increment_usage_with_check', {
          user_uuid: user_id,
          feature_name: feature
        });

        if (error) {
          console.error('Error incrementing usage:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to increment usage' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(result),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'reset': {
        // Reset monthly usage for all users
        const { error } = await supabase.rpc('reset_monthly_usage');

        if (error) {
          console.error('Error resetting usage:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to reset usage' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Monthly usage reset completed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'enforce': {
        // Enforce usage limits for specific user or all users
        const { error } = await supabase.rpc('enforce_usage_limits', {
          user_uuid: user_id === 'all' ? null : user_id
        });

        if (error) {
          console.error('Error enforcing limits:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to enforce usage limits' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Usage limits enforced' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});