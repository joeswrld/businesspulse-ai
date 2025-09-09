import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HCaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔐 hCaptcha verification request received');

    const { token, action } = await req.json()

    if (!token) {
      console.error('❌ No hCaptcha token provided');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No hCaptcha token provided' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get hCaptcha secret key from environment
    const hcaptchaSecret = Deno.env.get('HCAPTCHA_SECRET_KEY')
    if (!hcaptchaSecret) {
      console.error('❌ hCaptcha secret key not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'hCaptcha verification not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the hCaptcha token with hCaptcha API
    const verifyUrl = 'https://hcaptcha.com/siteverify'
    const formData = new FormData()
    formData.append('secret', hcaptchaSecret)
    formData.append('response', token)
    formData.append('remoteip', req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '')

    console.log('🔐 Verifying hCaptcha token with hCaptcha API...');
    
    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      body: formData,
    })

    if (!verifyResponse.ok) {
      console.error('❌ hCaptcha API request failed:', verifyResponse.status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to verify hCaptcha token' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result: HCaptchaResponse = await verifyResponse.json()
    
    console.log('🔐 hCaptcha verification result:', result);

    if (!result.success) {
      console.error('❌ hCaptcha verification failed:', result['error-codes']);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'hCaptcha verification failed',
          errorCodes: result['error-codes'] || []
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ hCaptcha verification successful');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'hCaptcha verification successful',
        challenge_ts: result.challenge_ts,
        hostname: result.hostname
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ hCaptcha verification error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error during hCaptcha verification' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})