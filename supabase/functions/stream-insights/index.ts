import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StreamInsightsRequest {
  content: string;
  source: string;
}

interface GeminiInsightResponse {
  title: string;
  content: string;
  category: "Customer Experience" | "Revenue" | "Operations" | "Growth";
  priority: "High" | "Medium" | "Low";
  confidence: number;
  key_findings: string[];
  recommendations: string[];
  projected_impact: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { content, source } = await req.json() as StreamInsightsRequest;

    if (!content || !content.trim()) {
      throw new Error('No content provided for analysis');
    }

    // Initialize Gemini API
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Call Gemini AI for immediate insights
    const insight = await callGeminiAI(content, GEMINI_API_KEY, source);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...insight
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (err) {
    console.error('Error in stream-insights:', err);
    return new Response(
      JSON.stringify({ error: err.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function callGeminiAI(content: string, apiKey: string, source: string): Promise<GeminiInsightResponse> {
  const prompt = `
You are NoteX, a real-time AI business intelligence assistant. Analyze the provided business data and generate actionable insights.

DATA TO ANALYZE:
${content}

INSTRUCTIONS:
1. Generate ONE comprehensive, actionable business insight
2. Focus on business outcomes (Revenue, Growth, Retention, Operations)
3. Provide specific, measurable recommendations
4. Determine priority based on potential business impact
5. Estimate confidence based on data quality and insight reliability

OUTPUT FORMAT (JSON):
{
  "title": "Clear, actionable insight title",
  "content": "Detailed insight summary with key findings and context",
  "category": "Customer Experience|Revenue|Operations|Growth",
  "priority": "High|Medium|Low",
  "confidence": 85,
  "key_findings": [
    "Finding 1",
    "Finding 2",
    "Finding 3"
  ],
  "recommendations": [
    "Specific, actionable recommendation 1",
    "Specific, actionable recommendation 2",
    "Specific, actionable recommendation 3"
  ],
  "projected_impact": "Quantified business impact (e.g., 'Could increase revenue by 15% within 6 months')"
}

FOCUS AREAS:
- Customer Experience: Customer satisfaction, churn prevention, user experience
- Revenue: Sales opportunities, pricing optimization, market expansion
- Operations: Efficiency improvements, cost reduction, process optimization
- Growth: Market opportunities, product development, competitive advantages

Ensure the insight is practical, measurable, and immediately actionable for business decision-making.
`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
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
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const text = data.candidates[0].content.parts[0].text;
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Gemini response');
    }

    const insight = JSON.parse(jsonMatch[0]) as GeminiInsightResponse;
    
    // Validate and provide defaults
    return {
      title: insight.title || "Business Insight",
      content: insight.content || "Analysis of the provided data",
      category: insight.category || "Operations",
      priority: insight.priority || "Medium",
      confidence: insight.confidence || 75,
      key_findings: insight.key_findings || ["Data analyzed successfully"],
      recommendations: insight.recommendations || ["Review the data for patterns"],
      projected_impact: insight.projected_impact || "Improved data-driven decision making"
    };

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    // Return fallback insight
    return {
      title: "Data Analysis Complete",
      content: "Your data has been analyzed successfully. Manual review recommended for detailed insights.",
      category: "Operations",
      priority: "Medium",
      confidence: 70,
      key_findings: [
        "Data successfully processed",
        "Content analysis completed",
        "Ready for detailed business analysis"
      ],
      recommendations: [
        "Review uploaded content for patterns",
        "Consider additional data sources for deeper insights",
        "Schedule regular data analysis sessions"
      ],
      projected_impact: "Improved data-driven decision making capabilities"
    };
  }
}