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
    const { data } = await req.json()
    
    if (!data) {
      throw new Error('No data provided')
    }

    // Get Gemini API key from environment
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Enhanced prompt for actionable insights
    const prompt = `Analyze the following user feedback and provide structured, actionable insights. 

Please return a JSON object with the following structure:

{
  "summary": "A concise 2-3 sentence summary of the main points",
  "sentiment": {
    "overall": "positive|negative|neutral",
    "confidence": 0.85,
    "breakdown": {
      "positive": 0.6,
      "negative": 0.2,
      "neutral": 0.2
    }
  },
  "themes": [
    {
      "name": "Theme name",
      "frequency": 5,
      "sentiment": "positive|negative|neutral",
      "examples": ["example quote 1", "example quote 2"]
    }
  ],
  "suggestions": [
    {
      "action": "Specific actionable recommendation",
      "priority": "high|medium|low",
      "category": "feature|support|bug|improvement",
      "impact": "high|medium|low"
    }
  ],
  "trends": {
    "sentiment_trend": "improving|declining|stable",
    "key_insights": ["insight 1", "insight 2", "insight 3"]
  },
  "metrics": {
    "total_feedback_count": 1,
    "positive_ratio": 0.6,
    "negative_ratio": 0.2,
    "neutral_ratio": 0.2
  }
}

Focus on extracting:
1. Key themes and topics users discuss
2. Specific actionable recommendations
3. Sentiment trends and patterns
4. Business impact and priority levels

User feedback to analyze:
${data}

Return only valid JSON.`

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const result = await response.json()
    const generatedText = result.candidates[0].content.parts[0].text

    // Extract JSON from Gemini response
    let insights
    try {
      // Try to find JSON in the response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', generatedText)
      // Fallback to basic analysis
      insights = {
        summary: generatedText.substring(0, 200) + "...",
        sentiment: {
          overall: "neutral",
          confidence: 0.5,
          breakdown: { positive: 0.33, negative: 0.33, neutral: 0.34 }
        },
        themes: [{
          name: "General Feedback",
          frequency: 1,
          sentiment: "neutral",
          examples: [data.substring(0, 100)]
        }],
        suggestions: [{
          action: "Review the feedback for specific improvement areas",
          priority: "medium",
          category: "improvement",
          impact: "medium"
        }],
        trends: {
          sentiment_trend: "stable",
          key_insights: ["Feedback received and being analyzed"]
        },
        metrics: {
          total_feedback_count: 1,
          positive_ratio: 0.33,
          negative_ratio: 0.33,
          neutral_ratio: 0.34
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: insights
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})