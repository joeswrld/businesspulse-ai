import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FeedbackRequest {
  project_id: string;
  message: string;
  name?: string;
  email?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  tags?: string[];
}

interface PlanLimits {
  free: number;
  pro: number;
  business: number;
}

const PLAN_LIMITS: PlanLimits = {
  free: 50,
  pro: 300,
  business: -1 // unlimited
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // Get request body
    let body: FeedbackRequest;
    try {
      body = await req.json();
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { project_id, message, name, email, sentiment, tags } = body;

    // Validate required fields
    if (!project_id || !message) {
      console.error('Missing required fields:', { project_id, message });
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          received: { project_id, message },
          required: ['project_id', 'message']
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client with authorization header
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { 
        global: { 
          headers: { 
            Authorization: authHeader 
          } 
        } 
      }
    )

    // Validate the user by getting user info
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User validation error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Processing feedback for user: ${user.id}`);

    // Get current month start date
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    // Get user's billing profile to determine plan
    console.log('Fetching user billing profile...');
    const { data: billingProfile, error: billingError } = await supabase
      .from('billing_profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (billingError) {
      console.error('Error fetching billing profile:', billingError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch billing profile', 
          details: billingError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Default to 'free' plan if no billing profile exists
    const userPlan = billingProfile?.plan || 'free';
    console.log(`User plan: ${userPlan}`);

    // Check if user has unlimited plan
    if (userPlan === 'business') {
      console.log('Business plan - unlimited feedback allowed');
    } else {
      // Get or create usage counter for current month
      console.log('Checking usage limits...');
      const { data: usageCounter, error: usageError } = await supabase
        .from('usage_counters')
        .select('feedback_count')
        .eq('user_id', user.id)
        .eq('month_start', monthStartStr)
        .single();

      if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching usage counter:', usageError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch usage counter', 
            details: usageError.message 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const currentUsage = usageCounter?.feedback_count || 0;
      const planLimit = PLAN_LIMITS[userPlan as keyof PlanLimits];
      
      console.log(`Current usage: ${currentUsage}/${planLimit}`);

      // Check if user has exceeded their plan limit
      if (currentUsage >= planLimit) {
        console.log(`Usage limit exceeded for ${userPlan} plan`);
        
        let errorMessage = '';
        if (userPlan === 'free') {
          errorMessage = 'Free plan limit (50 feedbacks) reached. Upgrade to Pro or Business to continue.';
        } else if (userPlan === 'pro') {
          errorMessage = 'Pro plan limit (300 feedbacks) reached. Upgrade to Business to continue.';
        }

        return new Response(
          JSON.stringify({ 
            error: 'Feedback limit reached',
            message: errorMessage,
            plan: userPlan,
            current_usage: currentUsage,
            limit: planLimit,
            reset_date: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0]
          }),
          { 
            status: 429, // Too Many Requests
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Analyze sentiment using Gemini API
    console.log('Analyzing sentiment...');
    let analyzedSentiment = sentiment || 'neutral';
    
    try {
      const sentimentResult = await analyzeSentimentWithGemini(message);
      if (sentimentResult && ['positive', 'negative', 'neutral'].includes(sentimentResult)) {
        analyzedSentiment = sentimentResult;
        console.log(`Sentiment analysis result: ${analyzedSentiment}`);
      } else {
        console.log('Sentiment analysis failed, using fallback: neutral');
        analyzedSentiment = 'neutral';
      }
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      console.log('Using fallback: neutral');
      analyzedSentiment = 'neutral';
    }

    // Insert feedback into database
    console.log('Inserting feedback...');
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedbacks')
      .insert({
        user_id: user.id,
        project_id: project_id,
        message: message,
        name: name || null,
        email: email || null,
        status: 'new',
        sentiment: analyzedSentiment,
        tags: tags || [],
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (feedbackError) {
      console.error('Error inserting feedback:', feedbackError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create feedback', 
          details: feedbackError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update usage counter (only for limited plans)
    if (userPlan !== 'business') {
      console.log('Updating usage counter...');
      const { error: updateError } = await supabase
        .from('usage_counters')
        .upsert({
          user_id: user.id,
          month_start: monthStartStr,
          feedback_count: (usageCounter?.feedback_count || 0) + 1,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,month_start'
        });

      if (updateError) {
        console.error('Error updating usage counter:', updateError);
        // Don't fail the request if usage counter update fails
        console.log('Warning: Usage counter update failed, but feedback was created');
      }
    }

    console.log(`Feedback created successfully: ${feedback.id}`);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Feedback created successfully',
        data: {
          feedback_id: feedback.id,
          user_id: user.id,
          plan: userPlan,
          usage: userPlan !== 'business' ? {
            current: (usageCounter?.feedback_count || 0) + 1,
            limit: PLAN_LIMITS[userPlan as keyof PlanLimits],
            reset_date: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0]
          } : null
        }
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Create feedback error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function analyzeSentimentWithGemini(message: string): Promise<string | null> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not found');
    return null;
  }

  const prompt = `Analyze the sentiment of the following feedback message and return ONLY one of these three words: positive, negative, or neutral.

Feedback message: "${message}"

Rules:
- "positive" for praise, satisfaction, compliments, or positive experiences
- "negative" for complaints, criticism, dissatisfaction, or negative experiences  
- "neutral" for factual statements, questions, suggestions, or mixed/unclear sentiment

Return only the single word (positive, negative, or neutral) with no other text.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.1,
          maxOutputTokens: 10,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const responseData = await response.json();
    
    if (!responseData.candidates || !responseData.candidates[0] || !responseData.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const text = responseData.candidates[0].content.parts[0].text.trim().toLowerCase();
    
    // Validate the response
    if (['positive', 'negative', 'neutral'].includes(text)) {
      return text;
    } else {
      console.error('Invalid sentiment response from Gemini:', text);
      return null;
    }

  } catch (error) {
    console.error('Error calling Gemini API for sentiment analysis:', error);
    return null;
  }
}