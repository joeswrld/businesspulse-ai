import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeminiAnalyticsRequest {
  user_id: string;
  insights: any[];
  reports: any[];
  data_sources: any[];
  ai_jobs: any[];
  team_members: any[];
}

interface GeminiAnalyticsResponse {
  overall_sentiment: 'positive' | 'negative' | 'neutral';
  top_themes: string[];
  recommended_actions: string[];
  kpis: {
    total_insights: number;
    reports_generated: number;
    growth_rate: string;
    team_members: number;
    active_ai_jobs: number;
    data_sources_count: number;
  };
  trends: {
    sentiment_trend: 'improving' | 'declining' | 'stable';
    activity_trend: 'increasing' | 'decreasing' | 'stable';
    priority_distribution: Record<string, number>;
  };
  insights_summary: string;
  business_recommendations: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, insights, reports, data_sources, ai_jobs, team_members }: GeminiAnalyticsRequest = await req.json();

    if (!user_id) {
      throw new Error('Missing required parameter: user_id');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate analytics using Gemini
    const analytics = await generateAnalyticsWithGemini({
      insights: insights || [],
      reports: reports || [],
      data_sources: data_sources || [],
      ai_jobs: ai_jobs || [],
      team_members: team_members || []
    });

    // Store analytics results in database for caching
    await supabase
      .from('analytics_daily')
      .upsert({
        user_id,
        date: new Date().toISOString().split('T')[0],
        total_insights: analytics.kpis.total_insights,
        high_priority_insights: insights.filter(i => i.priority === 'High').length,
        avg_confidence_score: insights.length > 0 ? 
          insights.reduce((sum, i) => sum + (i.confidence_score || 0), 0) / insights.length : 0,
        total_feedback: 0, // Will be calculated from feedback table
        positive_feedback_ratio: 0.8, // Default value
        retention_risk_score: analytics.overall_sentiment === 'negative' ? 0.7 : 0.3,
        upsell_potential_score: analytics.overall_sentiment === 'positive' ? 0.8 : 0.4,
        operational_bottleneck_score: analytics.trends.activity_trend === 'declining' ? 0.6 : 0.2,
        market_expansion_score: analytics.overall_sentiment === 'positive' ? 0.9 : 0.5
      });

    return new Response(
      JSON.stringify({
        success: true,
        result: analytics,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in geminiAnalytics:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function generateAnalyticsWithGemini(data: {
  insights: any[];
  reports: any[];
  data_sources: any[];
  ai_jobs: any[];
  team_members: any[];
}): Promise<GeminiAnalyticsResponse> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not found');
    return generateDefaultAnalytics(data);
  }

  const prompt = `You are a senior business analyst and data scientist. Analyze the following business data and provide comprehensive analytics insights.

Business Data Summary:
- Total Insights: ${data.insights.length}
- Reports Generated: ${data.reports.length}
- Data Sources: ${data.data_sources.length}
- Active AI Jobs: ${data.ai_jobs.filter(j => j.status === 'processing').length}
- Team Members: ${data.team_members.length}

Insights Data (first 5):
${JSON.stringify(data.insights.slice(0, 5), null, 2)}

Reports Data (first 3):
${JSON.stringify(data.reports.slice(0, 3), null, 2)}

Data Sources Types:
${data.data_sources.map(ds => ds.type).join(', ')}

AI Job Statuses:
${data.ai_jobs.map(j => j.status).join(', ')}

Based on this data, provide a comprehensive business analytics summary. Return your response as a JSON object in this exact format:

{
  "overall_sentiment": "positive|negative|neutral",
  "top_themes": ["theme1", "theme2", "theme3", "theme4", "theme5"],
  "recommended_actions": ["action1", "action2", "action3", "action4"],
  "kpis": {
    "total_insights": ${data.insights.length},
    "reports_generated": ${data.reports.length},
    "growth_rate": "X%",
    "team_members": ${data.team_members.length},
    "active_ai_jobs": ${data.ai_jobs.filter(j => j.status === 'processing').length},
    "data_sources_count": ${data.data_sources.length}
  },
  "trends": {
    "sentiment_trend": "improving|declining|stable",
    "activity_trend": "increasing|decreasing|stable",
    "priority_distribution": {
      "High": ${data.insights.filter(i => i.priority === 'High').length},
      "Medium": ${data.insights.filter(i => i.priority === 'Medium').length},
      "Low": ${data.insights.filter(i => i.priority === 'Low').length}
    }
  },
  "insights_summary": "A comprehensive 2-3 sentence summary of the business intelligence gathered from this data",
  "business_recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}

Focus on actionable business intelligence, identify patterns, and provide specific recommendations for business growth and optimization.`;

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
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
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

    const text = responseData.candidates[0].content.parts[0].text;
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Gemini response');
    }

    const analytics = JSON.parse(jsonMatch[0]);
    
    // Validate and sanitize the response
    return {
      overall_sentiment: analytics.overall_sentiment || 'neutral',
      top_themes: Array.isArray(analytics.top_themes) ? analytics.top_themes.slice(0, 5) : [],
      recommended_actions: Array.isArray(analytics.recommended_actions) ? analytics.recommended_actions.slice(0, 4) : [],
      kpis: {
        total_insights: analytics.kpis?.total_insights || data.insights.length,
        reports_generated: analytics.kpis?.reports_generated || data.reports.length,
        growth_rate: analytics.kpis?.growth_rate || "0%",
        team_members: analytics.kpis?.team_members || data.team_members.length,
        active_ai_jobs: analytics.kpis?.active_ai_jobs || data.ai_jobs.filter(j => j.status === 'processing').length,
        data_sources_count: analytics.kpis?.data_sources_count || data.data_sources.length
      },
      trends: {
        sentiment_trend: analytics.trends?.sentiment_trend || 'stable',
        activity_trend: analytics.trends?.activity_trend || 'stable',
        priority_distribution: analytics.trends?.priority_distribution || {
          "High": data.insights.filter(i => i.priority === 'High').length,
          "Medium": data.insights.filter(i => i.priority === 'Medium').length,
          "Low": data.insights.filter(i => i.priority === 'Low').length
        }
      },
      insights_summary: analytics.insights_summary || "Analysis of business data shows patterns in insights generation and report creation.",
      business_recommendations: Array.isArray(analytics.business_recommendations) ? analytics.business_recommendations.slice(0, 3) : []
    };

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return generateDefaultAnalytics(data);
  }
}

function generateDefaultAnalytics(data: {
  insights: any[];
  reports: any[];
  data_sources: any[];
  ai_jobs: any[];
  team_members: any[];
}): GeminiAnalyticsResponse {
  const totalInsights = data.insights.length;
  const totalReports = data.reports.length;
  const activeJobs = data.ai_jobs.filter(j => j.status === 'processing').length;
  const teamSize = data.team_members.length;
  
  // Calculate growth rate based on data volume
  const growthRate = totalInsights > 10 ? "15%" : totalInsights > 5 ? "8%" : "0%";
  
  // Determine sentiment based on data patterns
  const sentiment = totalInsights > 20 ? 'positive' : totalInsights > 10 ? 'neutral' : 'negative';
  
  return {
    overall_sentiment: sentiment,
    top_themes: ["Business Intelligence", "Data Analysis", "Performance Metrics", "Operational Insights", "Growth Opportunities"],
    recommended_actions: [
      "Continue uploading diverse data sources for comprehensive insights",
      "Review and prioritize high-confidence insights for immediate action",
      "Expand team collaboration to leverage collective intelligence",
      "Monitor AI job performance and optimize processing workflows"
    ],
    kpis: {
      total_insights: totalInsights,
      reports_generated: totalReports,
      growth_rate: growthRate,
      team_members: teamSize,
      active_ai_jobs: activeJobs,
      data_sources_count: data.data_sources.length
    },
    trends: {
      sentiment_trend: sentiment === 'positive' ? 'improving' : sentiment === 'negative' ? 'declining' : 'stable',
      activity_trend: totalInsights > 15 ? 'increasing' : totalInsights > 8 ? 'stable' : 'decreasing',
      priority_distribution: {
        "High": data.insights.filter(i => i.priority === 'High').length,
        "Medium": data.insights.filter(i => i.priority === 'Medium').length,
        "Low": data.insights.filter(i => i.priority === 'Low').length
      }
    },
    insights_summary: `Your business intelligence system has generated ${totalInsights} insights from ${data.data_sources.length} data sources, with ${totalReports} reports created. The system shows ${sentiment} sentiment with ${activeJobs} active AI processing jobs.`,
    business_recommendations: [
      "Focus on high-priority insights for immediate business impact",
      "Leverage team collaboration to maximize insights utilization",
      "Monitor AI processing efficiency for optimal performance"
    ]
  };
}