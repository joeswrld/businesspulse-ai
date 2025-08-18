import { serve } from "https://deno.land/std@0.155.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { data } = await req.json();
    if (!data) throw new Error("No input data provided");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    // ChatGPT-level professional prompt with role, persona, and step-by-step reasoning
    const prompt = `
You are a senior product analyst with 10+ years of experience in UX research, customer insights, and data-driven product strategy. You specialize in transforming raw user feedback into actionable business intelligence that drives product decisions.

Your expertise includes:
- Customer journey mapping and pain point identification
- Sentiment analysis and emotional intelligence
- Feature prioritization and roadmap planning
- User experience optimization
- Competitive analysis and market positioning

TASK: Analyze the following user feedback and produce professional, actionable insights.

USER FEEDBACK:
"${data}"

ANALYSIS PROCESS (Follow these steps carefully):

Step 1: THEME IDENTIFICATION
- Identify 3-7 key themes or topics mentioned in the feedback
- Look for recurring patterns, pain points, and positive experiences
- Consider both explicit statements and implicit needs
- Focus on actionable themes that can drive product decisions

Step 2: SENTIMENT ANALYSIS
- Determine the overall sentiment (positive/negative/neutral)
- Consider the emotional tone and urgency of the feedback
- Look for mixed sentiments and prioritize the dominant emotion
- Assess the confidence level of your sentiment classification

Step 3: IMPACT ASSESSMENT
- Evaluate the business impact of each identified theme
- Consider user frequency, severity, and potential revenue impact
- Identify critical issues that require immediate attention
- Prioritize themes based on strategic importance

Step 4: ACTIONABLE RECOMMENDATIONS
- Generate 3-5 specific, implementable actions
- Each action should be concrete and measurable
- Consider effort vs. impact trade-offs
- Include both quick wins and strategic initiatives

Step 5: EXECUTIVE SUMMARY
- Create a concise, professional summary (2-3 sentences)
- Highlight the most important insights and recommendations
- Use business language appropriate for stakeholders
- Focus on actionable outcomes

FEW-SHOT EXAMPLES:

Example 1:
Feedback: "I love the new dashboard design, but it's really slow to load. The search feature is confusing and I can't find what I need quickly. Overall, the interface looks great but needs performance improvements."

Analysis:
{
  "summary": "Users appreciate the new dashboard's visual design but experience significant performance issues, particularly with loading speed and search functionality, which impacts their ability to efficiently complete tasks.",
  "sentiment": "neutral",
  "key_themes": ["dashboard design", "performance issues", "search functionality", "user efficiency", "loading speed"],
  "suggested_actions": [
    "Optimize dashboard loading performance and implement caching strategies",
    "Redesign search interface with better UX patterns and autocomplete",
    "Conduct user testing to identify specific search pain points",
    "Implement performance monitoring for dashboard metrics"
  ]
}

Example 2:
Feedback: "This app is absolutely terrible. It crashes every time I try to upload a file, the customer support is non-existent, and I've been waiting for a refund for weeks. I'm switching to a competitor."

Analysis:
{
  "summary": "Critical user experience failures including app crashes, poor customer support, and billing issues are driving customer churn and negative sentiment, requiring immediate intervention.",
  "sentiment": "negative",
  "key_themes": ["app stability", "customer support", "billing issues", "customer churn", "file upload problems"],
  "suggested_actions": [
    "Immediately investigate and fix file upload crash issues",
    "Establish emergency customer support response protocol",
    "Audit and streamline refund processing system",
    "Implement proactive customer retention outreach program"
  ]
}

Now analyze the provided feedback using the same structured approach:

RESPONSE FORMAT (Return ONLY valid JSON):
{
  "summary": "Professional 2-3 sentence summary highlighting key insights and business impact",
  "sentiment": "positive|negative|neutral",
  "key_themes": ["theme1", "theme2", "theme3", "theme4", "theme5"],
  "suggested_actions": [
    "Specific, actionable recommendation 1",
    "Specific, actionable recommendation 2", 
    "Specific, actionable recommendation 3",
    "Specific, actionable recommendation 4"
  ]
}

Guidelines:
- Be objective and professional in tone
- Focus on actionable insights that drive business value
- Consider both immediate fixes and strategic improvements
- Ensure all recommendations are specific and implementable
- Use business language appropriate for product teams and stakeholders
`;

    // Call Gemini API with optimized parameters for deeper analysis
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: prompt }] }
          ],
          generationConfig: {
            temperature: 0.2,        // Low temperature for consistency
            topK: 50,               // Slightly higher for more variety in reasoning
            topP: 0.9,              // Maintain quality while allowing creativity
            maxOutputTokens: 1200   // Increased for deeper analysis and reasoning
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API request failed: ${response.status}`);
    }

    const geminiData = await response.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    // Enhanced JSON parsing with better error handling
    let parsed = {
      summary: "Analysis failed - unable to process feedback",
      sentiment: "neutral",
      key_themes: [],
      suggested_actions: []
    };

    try {
      // Try to extract JSON from the response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[0]);
        
        // Validate and ensure all required fields exist
        parsed = {
          summary: extracted.summary || "No summary available",
          sentiment: extracted.sentiment || "neutral",
          key_themes: Array.isArray(extracted.key_themes) ? extracted.key_themes : [],
          suggested_actions: Array.isArray(extracted.suggested_actions) ? extracted.suggested_actions : []
        };
      } else {
        // Fallback: try to extract insights from raw text
        const lowerText = data.toLowerCase();
        const sentiment = lowerText.includes('love') || lowerText.includes('amazing') || lowerText.includes('great') ? 'positive' :
                         lowerText.includes('hate') || lowerText.includes('terrible') || lowerText.includes('awful') ? 'negative' : 'neutral';
        
        parsed = {
          summary: `Analysis of feedback: ${data.substring(0, 100)}...`,
          sentiment: sentiment,
          key_themes: ["general feedback"],
          suggested_actions: ["Review feedback for specific improvement areas"]
        };
      }
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.error('Raw Gemini response:', rawText);
      
      // Final fallback with basic analysis
      parsed = {
        summary: rawText.length > 200 ? rawText.substring(0, 200) + "..." : rawText,
        sentiment: "neutral",
        key_themes: ["feedback analysis"],
        suggested_actions: ["Review the provided analysis for actionable insights"]
      };
    }

    return new Response(
      JSON.stringify({ success: true, result: parsed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error in insightsAnalysis:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});