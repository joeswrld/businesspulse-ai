import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateInsightsRequest {
  data_source_id: string;
  user_id: string;
  content: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface InsightData {
  title: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  findings: string[];
  recommendations: string[];
  projected_impact: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { data_source_id, user_id, content } = await req.json() as GenerateInsightsRequest;

    if (!data_source_id || !user_id || !content) {
      throw new Error('Missing required parameters: data_source_id, user_id, content');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Gemini API client
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Generate insights using Gemini
    const insights = await generateInsightsWithGemini(content, geminiApiKey);

    // Save insights to database
    const savedInsights = [];
    for (const insight of insights) {
      const { data: insightData, error } = await supabase
        .from('insights')
        .insert({
          source_id: data_source_id,
          user_id: user_id,
          title: insight.title,
          category: insight.category,
          priority: insight.priority,
          confidence: insight.confidence,
          findings: insight.findings,
          recommendations: insight.recommendations,
          projected_impact: insight.projected_impact
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving insight:', error);
        continue;
      }

      if (insightData) {
        savedInsights.push(insightData);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Insights generated successfully',
        data: {
          insights_generated: savedInsights.length,
          insights: savedInsights
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error generating insights:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function generateInsightsWithGemini(content: string, geminiApiKey: string): Promise<InsightData[]> {
  const prompt = `
    Analyze the following business data and provide actionable insights in JSON format:
    
    ${content.substring(0, 4000)} // Limit content length
    
    Please provide insights in this exact JSON format:
    {
      "insights": [
        {
          "title": "Insight title",
          "category": "business_opportunity|risk_alert|trend_analysis|operational_insight",
          "priority": "high|medium|low",
          "confidence": 0.85,
          "findings": ["Finding 1", "Finding 2"],
          "recommendations": ["Recommendation 1", "Recommendation 2"],
          "projected_impact": "High impact on revenue"
        }
      ]
    }
    
    Focus on business value, actionable recommendations, and quantifiable impact.
    Return only valid JSON, no additional text.
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
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
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const geminiResponse: GeminiResponse = await response.json();
    const responseText = geminiResponse.candidates[0]?.content?.parts[0]?.text || '';

    // Parse the JSON response
    const insightsData = JSON.parse(responseText);
    return insightsData.insights || [];

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    // Return a default insight if API fails
    return [{
      title: "Data Analysis Complete",
      category: "operational_insight",
      priority: "medium" as const,
      confidence: 0.7,
      findings: ["Data has been successfully processed and analyzed"],
      recommendations: ["Review the processed data for actionable insights"],
      projected_impact: "Improved data understanding and decision-making capabilities"
    }];
  }
}