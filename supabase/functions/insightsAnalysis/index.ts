import { serve } from "https://deno.land/std@0.155.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { data } = await req.json();
    if (!data) throw new Error("No input data provided");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const prompt = `
    You are a senior business insights analyst with expertise in sentiment analysis and pattern recognition. 
    Analyze the following dataset and provide comprehensive insights with confidence scoring.
    
    Your analysis should include:
    1. **Sentiment Analysis**: Classify the overall sentiment and provide confidence level
    2. **Theme Extraction**: Identify key themes with confidence scores
    3. **Actionable Insights**: Suggest improvements with implementation priority
    4. **Confidence Metrics**: Rate your confidence in each analysis component
    
    CRITICAL: Analyze ONLY the provided data. Do not invent or assume information.
    
    Respond in this EXACT JSON structure:
    {
      "summary": "2-3 sentence executive summary of key findings",
      "sentiment": "positive|negative|neutral",
      "sentiment_confidence": 85,
      "sentiment_reasoning": "Brief explanation of sentiment classification",
      "key_themes": [
        {
          "theme": "theme name",
          "confidence": 90,
          "frequency": "high|medium|low",
          "description": "Brief description of the theme"
        }
      ],
      "suggested_actions": [
        {
          "action": "action description",
          "priority": "high|medium|low",
          "confidence": 85,
          "impact": "expected business impact"
        }
      ],
      "overall_confidence": 87,
      "data_quality_score": 92,
      "analysis_notes": "Any important notes about the analysis quality or limitations"
    }
    
    Confidence scoring guide:
    - 90-100: Very high confidence, clear patterns
    - 70-89: High confidence, good patterns
    - 50-69: Moderate confidence, some patterns
    - 30-49: Low confidence, unclear patterns
    - 0-29: Very low confidence, insufficient data
    
    Now analyze this dataset:
    ${JSON.stringify(data)}
    `
    

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            topK: 50,
            topP: 0.9,
            maxOutputTokens: 700
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API request failed: ${response.status}`);
    }

    const geminiData = await response.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    // Safe JSON parsing with defaults
    let parsed = {
      summary: "Analysis failed",
      sentiment: "neutral",
      sentiment_confidence: 50,
      sentiment_reasoning: "Analysis could not be completed",
      key_themes: [],
      suggested_actions: [],
      overall_confidence: 50,
      data_quality_score: 50,
      analysis_notes: "Analysis failed - using fallback data"
    };

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
        
        // Ensure all required fields exist with fallbacks
        parsed.summary ??= "No summary available";
        parsed.sentiment ??= "neutral";
        parsed.sentiment_confidence ??= 50;
        parsed.sentiment_reasoning ??= "Sentiment analysis completed";
        parsed.key_themes ??= [];
        parsed.suggested_actions ??= [];
        parsed.overall_confidence ??= 50;
        parsed.data_quality_score ??= 50;
        parsed.analysis_notes ??= "Analysis completed successfully";
        
        // Ensure key_themes and suggested_actions have proper structure
        if (Array.isArray(parsed.key_themes)) {
          parsed.key_themes = parsed.key_themes.map(theme => {
            if (typeof theme === 'string') {
              return {
                theme: theme,
                confidence: 70,
                frequency: "medium",
                description: "Theme identified from analysis"
              };
            }
            return {
              theme: theme.theme || "Unknown theme",
              confidence: theme.confidence || 70,
              frequency: theme.frequency || "medium",
              description: theme.description || "Theme identified from analysis"
            };
          });
        }
        
        if (Array.isArray(parsed.suggested_actions)) {
          parsed.suggested_actions = parsed.suggested_actions.map(action => {
            if (typeof action === 'string') {
              return {
                action: action,
                priority: "medium",
                confidence: 70,
                impact: "Expected to improve user experience"
              };
            }
            return {
              action: action.action || action,
              priority: action.priority || "medium",
              confidence: action.confidence || 70,
              impact: action.impact || "Expected to improve user experience"
            };
          });
        }
      }
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      parsed = {
        summary: "Analysis failed - could not parse response",
        sentiment: "neutral",
        sentiment_confidence: 30,
        sentiment_reasoning: "Unable to determine sentiment",
        key_themes: [],
        suggested_actions: [],
        overall_confidence: 30,
        data_quality_score: 30,
        analysis_notes: "Critical error in analysis processing"
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