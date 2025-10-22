import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BehaviorData {
  rageClicks: number;
  scrollBehavior: 'smooth' | 'erratic' | 'minimal';
  timeOnPage: number;
  interactionCount: number;
  feedbackMessage: string;
  sessionDuration: number;
}

interface BehaviorSentimentResult {
  behavior_sentiment: 'positive' | 'negative' | 'neutral' | 'frustrated';
  confidence: number;
  reasoning: string;
  behavior_indicators: {
    rage_clicks: number;
    scroll_pattern: string;
    time_efficiency: number;
    interaction_quality: number;
  };
  ai_analysis: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { behaviorData, sessionId, feedbackId } = await req.json()

    if (!behaviorData || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Analyze behavior patterns
    const analysis = await analyzeBehaviorSentiment(behaviorData)

    // Save behavior analysis to database
    const { error: insertError } = await supabaseClient
      .from('behavior_analysis')
      .insert({
        session_id: sessionId,
        feedback_id: feedbackId,
        rage_clicks: behaviorData.rageClicks,
        scroll_behavior_score: getScrollScore(behaviorData.scrollBehavior),
        time_on_page_seconds: behaviorData.timeOnPage,
        behavior_sentiment: analysis.behavior_sentiment,
        ai_analysis: JSON.stringify(analysis)
      })

    if (insertError) {
      console.error('Error saving behavior analysis:', insertError)
      // Don't fail the request if we can't save to database
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in behavior sentiment analysis:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function analyzeBehaviorSentiment(behaviorData: BehaviorData): Promise<BehaviorSentimentResult> {
  const {
    rageClicks,
    scrollBehavior,
    timeOnPage,
    interactionCount,
    feedbackMessage,
    sessionDuration
  } = behaviorData

  // Calculate behavior indicators
  const behaviorIndicators = {
    rage_clicks: rageClicks,
    scroll_pattern: scrollBehavior,
    time_efficiency: calculateTimeEfficiency(timeOnPage, sessionDuration),
    interaction_quality: calculateInteractionQuality(interactionCount, timeOnPage)
  }

  // Determine sentiment based on behavior patterns
  let behavior_sentiment: 'positive' | 'negative' | 'neutral' | 'frustrated'
  let confidence: number
  let reasoning: string

  // High rage clicks = frustrated
  if (rageClicks >= 3) {
    behavior_sentiment = 'frustrated'
    confidence = 0.9
    reasoning = `High number of rage clicks (${rageClicks}) indicates user frustration`
  }
  // Erratic scrolling + multiple rage clicks = negative
  else if (scrollBehavior === 'erratic' && rageClicks >= 2) {
    behavior_sentiment = 'negative'
    confidence = 0.8
    reasoning = `Erratic scrolling pattern combined with ${rageClicks} rage clicks suggests negative experience`
  }
  // Erratic scrolling alone = negative
  else if (scrollBehavior === 'erratic') {
    behavior_sentiment = 'negative'
    confidence = 0.7
    reasoning = 'Erratic scrolling pattern indicates difficulty finding information'
  }
  // Low interaction + short time = neutral/positive
  else if (interactionCount < 5 && timeOnPage < 30) {
    behavior_sentiment = 'positive'
    confidence = 0.6
    reasoning = 'Quick, efficient interaction suggests positive experience'
  }
  // High interaction + reasonable time = positive engagement
  else if (interactionCount > 10 && timeOnPage > 60) {
    behavior_sentiment = 'positive'
    confidence = 0.7
    reasoning = 'High engagement with reasonable time spent indicates positive experience'
  }
  // Default to neutral
  else {
    behavior_sentiment = 'neutral'
    confidence = 0.5
    reasoning = 'Standard interaction patterns with no clear positive or negative indicators'
  }

  // Generate AI analysis text
  const ai_analysis = generateAIAnalysis(behaviorData, behavior_sentiment, reasoning)

  return {
    behavior_sentiment,
    confidence,
    reasoning,
    behavior_indicators: behaviorIndicators,
    ai_analysis
  }
}

function calculateTimeEfficiency(timeOnPage: number, sessionDuration: number): number {
  if (sessionDuration === 0) return 0.5
  return Math.min(1, timeOnPage / sessionDuration)
}

function calculateInteractionQuality(interactionCount: number, timeOnPage: number): number {
  if (timeOnPage === 0) return 0.5
  const interactionsPerMinute = (interactionCount / timeOnPage) * 60
  // Optimal range is 5-15 interactions per minute
  if (interactionsPerMinute >= 5 && interactionsPerMinute <= 15) return 1
  if (interactionsPerMinute < 5) return 0.7 // Too few interactions
  return 0.3 // Too many interactions (potential frustration)
}

function getScrollScore(scrollBehavior: string): number {
  switch (scrollBehavior) {
    case 'smooth': return 0.8
    case 'minimal': return 0.6
    case 'erratic': return 0.2
    default: return 0.5
  }
}

function generateAIAnalysis(behaviorData: BehaviorData, sentiment: string, reasoning: string): string {
  const { rageClicks, scrollBehavior, timeOnPage, interactionCount } = behaviorData

  let analysis = `Behavior Analysis Summary:\n\n`
  
  analysis += `Sentiment: ${sentiment.toUpperCase()}\n`
  analysis += `Reasoning: ${reasoning}\n\n`
  
  analysis += `Key Metrics:\n`
  analysis += `• Rage Clicks: ${rageClicks} (${rageClicks >= 3 ? 'High frustration indicator' : rageClicks >= 1 ? 'Moderate concern' : 'Normal'})\n`
  analysis += `• Scroll Pattern: ${scrollBehavior} (${scrollBehavior === 'erratic' ? 'Indicates confusion' : scrollBehavior === 'smooth' ? 'Good navigation' : 'Minimal interaction'})\n`
  analysis += `• Time on Page: ${timeOnPage}s (${timeOnPage < 30 ? 'Quick interaction' : timeOnPage > 120 ? 'Extended engagement' : 'Normal duration'})\n`
  analysis += `• Total Interactions: ${interactionCount} (${interactionCount > 15 ? 'High engagement' : interactionCount < 5 ? 'Low engagement' : 'Moderate engagement'})\n\n`
  
  analysis += `Recommendations:\n`
  if (sentiment === 'frustrated' || sentiment === 'negative') {
    analysis += `• Investigate UI/UX issues causing confusion\n`
    analysis += `• Consider simplifying navigation or reducing cognitive load\n`
    analysis += `• Review error messages and help text\n`
  } else if (sentiment === 'positive') {
    analysis += `• User experience appears smooth and intuitive\n`
    analysis += `• Consider replicating successful patterns elsewhere\n`
  } else {
    analysis += `• Monitor for patterns over time\n`
    analysis += `• Consider A/B testing to improve engagement\n`
  }

  return analysis
}