import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_ENDPOINT = Deno.env.get('GEMINI_ENDPOINT')!;
const GEMINI_KEY = Deno.env.get('GEMINI_KEY')!;

Deno.serve(async (req) => {
  try {
    const { user_id } = await req.json();
    
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get recent user activity data from uploads table
    const { data: recentUploads, error: uploadsError } = await supabase
      .from('uploads')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (uploadsError) {
      throw new Error(`Failed to fetch uploads: ${uploadsError.message}`);
    }

    if (!recentUploads || recentUploads.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No recent data found. Please upload some data first.' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Prepare data for AI analysis
    const analysisData = recentUploads.map(upload => ({
      type: upload.kind,
      name: upload.filename || 'Text Data',
      content: upload.text_content || `File: ${upload.filename}`,
      created: upload.created_at,
      status: upload.status
    }));

    // Call Gemini API for analysis
    const prompt = `You are an AI business analyst for NoteX. Analyze the following user data and provide insights in this exact JSON format:

{
  "title": "A concise, actionable insight title",
  "category": "Choose from: Customer Analytics, Revenue Analytics, Operations, Growth, Marketing, or Product Analytics",
  "priority": "high, medium, or low based on business impact",
  "confidence": 85,
  "description": "A 2-3 sentence summary of the key findings and business implications",
  "key_findings": [
    "Key finding 1",
    "Key finding 2",
    "Key finding 3"
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2",
    "Actionable recommendation 3"
  ],
  "projected_impact": "High/Medium/Low - specific business outcome with metrics",
  "tags": ["tag1", "tag2", "tag3"],
  "source": "Brief description of data source"
}

User data to analyze:
${JSON.stringify(analysisData, null, 2)}

Return only valid JSON, no additional text.`;

    const aiResponse = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${GEMINI_KEY}` 
      },
      body: JSON.stringify({ prompt })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status} ${aiResponse.statusText}`);
    }

    const aiJson = await aiResponse.json();
    
    // Extract insights safely with fallbacks
    const insight = {
      title: aiJson.title || 'AI Generated Insight',
      category: aiJson.category || 'Analytics',
      priority: aiJson.priority || 'medium',
      confidence: Math.min(Math.max(aiJson.confidence || 75, 0), 100),
      description: aiJson.description || 'AI analysis of your data',
      key_findings: aiJson.key_findings || ['Analysis completed successfully'],
      recommendations: aiJson.recommendations || ['Review the data for additional patterns'],
      projected_impact: aiJson.projected_impact || 'Medium impact - review for business decisions',
      tags: aiJson.tags || ['ai-generated', 'analysis'],
      source: aiJson.source || 'AI Analysis'
    };

    // Insert the new insight
    const { data: newInsight, error: insertError } = await supabase
      .from('ai_insights')
      .insert({
        user_id,
        ...insight
      })
      .select('*')
      .single();

    if (insertError) {
      throw new Error(`Failed to save insight: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      message: 'New insight generated successfully',
      insight: newInsight
    }), { 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Insight generation error:', error);
    
    return new Response(JSON.stringify({ 
      ok: false, 
      error: String(error) 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' } 
    });
  }
});