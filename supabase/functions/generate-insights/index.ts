import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user from auth token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    console.log('Generating insights for user:', user.id);

    // Fetch user's data from multiple sources
    const [dataSources, analyticsEvents, goals, userPrefs] = await Promise.all([
      supabase.from('data_sources').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('analytics_events').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('user_preferences').select('*').eq('user_id', user.id).limit(5)
    ]);

    // Collect all available data
    const analysisData = {
      user_id: user.id,
      data_sources: dataSources.data || [],
      analytics_events: analyticsEvents.data || [],
      goals: goals.data || [],
      user_preferences: userPrefs.data || [],
      timestamp: new Date().toISOString()
    };

    // If no data exists, generate sample insights based on user profile
    if (!analysisData.data_sources.length && !analysisData.analytics_events.length && !analysisData.goals.length) {
      console.log('No user data found, generating sample insights');
      analysisData.sample_user = {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        note: "Sample insights generated for new user with no data"
      };
    }

    // Call Gemini API
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Analyze this business data and generate actionable insights. Data: ${JSON.stringify(analysisData, null, 2)}
            
            Please provide your analysis in the following JSON format:
            {
              "insights": [
                {
                  "title": "Brief, actionable title",
                  "summary": "2-3 sentence summary of the insight",
                  "category": "Revenue|Customer Experience|Operations|Growth|Marketing",
                  "priority": "high|medium|low",
                  "confidence": 75,
                  "key_findings": ["Finding 1", "Finding 2", "Finding 3"],
                  "recommendations": ["Recommendation 1", "Recommendation 2"],
                  "projected_impact": "Quantified impact description",
                  "tags": ["tag1", "tag2", "tag3"],
                  "insight_type": "trend|opportunity|risk|optimization"
                }
              ]
            }
            
            Focus on actionable business insights that can drive real results. Analyze patterns, trends, and opportunities.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini response received');

    // Parse Gemini response
    let insights;
    try {
      const content = geminiData.candidates[0].content.parts[0].text;
      // Extract JSON from response (Gemini sometimes adds extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const parsedResponse = JSON.parse(jsonStr);
      insights = parsedResponse.insights;
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      throw new Error('Failed to parse AI response');
    }

    // Save insights to database
    const savedInsights = [];
    for (const insight of insights) {
      const { data, error } = await supabase
        .from('ai_insights')
        .insert({
          user_id: user.id,
          title: insight.title,
          summary: insight.summary,
          content: {
            key_findings: insight.key_findings,
            recommendations: insight.recommendations,
            projected_impact: insight.projected_impact,
            tags: insight.tags
          },
          insight_type: insight.insight_type,
          industry_category: insight.category,
          priority: insight.priority,
          confidence_score: insight.confidence,
          is_actionable: true,
          data_source_id: analysisData.data_sources[0]?.id || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving insight:', error);
        continue;
      }

      savedInsights.push(data);
    }

    console.log(`Generated ${savedInsights.length} insights`);

    return new Response(JSON.stringify({ 
      success: true, 
      insights: savedInsights,
      count: savedInsights.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-insights function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to generate insights' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});