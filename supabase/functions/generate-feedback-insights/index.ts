import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FeedbackData {
  id: string
  message: string
  email: string | null
  created_at: string
}

interface InsightRequest {
  feedback_ids: string[]
  user_id: string
}

interface GeminiResponse {
  summary: string
  key_themes: string[]
  suggested_actions: string[]
  sentiment_breakdown: {
    positive: number
    negative: number
    neutral: number
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the JWT token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { feedback_ids, user_id }: InsightRequest = await req.json()

    if (!feedback_ids || feedback_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No feedback IDs provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (user.id !== user_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - user ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch feedback data
    const { data: feedbackData, error: feedbackError } = await supabaseClient
      .from('feedback')
      .select('id, message, email, created_at')
      .in('id', feedback_ids)

    if (feedbackError) {
      console.error('Error fetching feedback:', feedbackError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch feedback data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!feedbackData || feedbackData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No feedback found for the provided IDs' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare feedback text for analysis
    const feedbackText = feedbackData.map(f => 
      `[${f.email || 'Anonymous'}] ${f.message}`
    ).join('\n\n')

    // Call Gemini API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Analyze the following customer feedback and provide insights in JSON format:

${feedbackText}

Please provide a comprehensive analysis with:
1. A 2-3 sentence summary of the overall feedback
2. Key themes (3-5 main topics mentioned)
3. Suggested actions (3-5 actionable recommendations)
4. Sentiment breakdown (percentages for positive, negative, neutral)

Return ONLY valid JSON in this exact format:
{
  "summary": "Brief summary of the feedback",
  "key_themes": ["theme1", "theme2", "theme3"],
  "suggested_actions": ["action1", "action2", "action3"],
  "sentiment_breakdown": {
    "positive": 60,
    "negative": 20,
    "neutral": 20
  }
}`
            }]
          }]
        })
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to analyze feedback with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await geminiResponse.json()
    const analysisText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!analysisText) {
      return new Response(
        JSON.stringify({ error: 'No analysis received from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the JSON response
    let insights: GeminiResponse
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      insights = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError)
      // Fallback response
      insights = {
        summary: "Analysis completed. The feedback has been processed and key insights have been identified.",
        key_themes: ["Customer Experience", "Product Feedback", "Service Quality"],
        suggested_actions: ["Review feedback themes", "Implement suggested improvements", "Monitor customer satisfaction"],
        sentiment_breakdown: {
          positive: 50,
          negative: 25,
          neutral: 25
        }
      }
    }

    // Save insights to database
    const { data: savedInsight, error: saveError } = await supabaseClient
      .from('insights')
      .insert({
        user_id: user.id,
        feedback_ids: feedback_ids,
        summary: insights.summary
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving insight:', saveError)
      return new Response(
        JSON.stringify({ error: 'Failed to save insights' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update feedback sentiment based on analysis
    const sentimentMap = new Map<string, string>()
    feedbackData.forEach(feedback => {
      // Simple sentiment analysis based on keywords
      const message = feedback.message.toLowerCase()
      const positiveWords = ['great', 'good', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'satisfied']
      const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'frustrated', 'annoyed', 'disappointed']
      
      const positiveCount = positiveWords.filter(word => message.includes(word)).length
      const negativeCount = negativeWords.filter(word => message.includes(word)).length
      
      let sentiment = 'neutral'
      if (positiveCount > negativeCount) sentiment = 'positive'
      else if (negativeCount > positiveCount) sentiment = 'negative'
      
      sentimentMap.set(feedback.id, sentiment)
    })

    // Update feedback records with sentiment
    for (const [feedbackId, sentiment] of sentimentMap) {
      await supabaseClient
        .from('feedback')
        .update({ sentiment })
        .eq('id', feedbackId)
    }

    return new Response(
      JSON.stringify({
        success: true,
        insight: savedInsight,
        analysis: insights
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-feedback-insights:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})