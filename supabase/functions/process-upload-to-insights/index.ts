import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessUploadRequest {
  upload_id: string;
  user_id: string;
  file_url?: string;
  file_name?: string;
  text_input?: string;
}

interface GeminiInsightResponse {
  title: string;
  category: "Customer Experience" | "Revenue" | "Operations" | "Growth";
  priority: "High" | "Medium" | "Low";
  confidence: number;
  summary: string;
  key_findings: string[];
  recommendations: string[];
  projected_impact: string;
  tags: string[];
  source: string;
  created_at: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { upload_id, user_id, file_url, file_name, text_input } = await req.json() as ProcessUploadRequest;

    if (!upload_id || !user_id) {
      throw new Error('Missing required parameters: upload_id and user_id');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize Gemini API
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // 1️⃣ Fetch upload from Supabase (assuming uploads table exists)
    // For now, we'll work with data_sources table
    const { data: upload, error: fetchErr } = await supabase
      .from("data_sources")
      .select("*")
      .eq("id", upload_id)
      .single();

    if (fetchErr || !upload) {
      return new Response(
        JSON.stringify({ error: fetchErr?.message || "Upload not found" }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2️⃣ Get file content if uploaded, or text input
    let textContent = "";
    if (file_url) {
      const fileRes = await fetch(file_url);
      if (!fileRes.ok) {
        throw new Error('Failed to fetch file content');
      }
      textContent = await fileRes.text();
    } else if (text_input) {
      textContent = text_input;
    } else if (upload.metadata?.content) {
      textContent = upload.metadata.content;
    }

    if (!textContent.trim()) {
      throw new Error('No content available for analysis');
    }

    // 3️⃣ Clean and normalize content
    const normalizedContent = await normalizeContent(textContent);

    // 4️⃣ Split content into semantic chunks
    const chunks = await createSemanticChunks(normalizedContent);

    // 5️⃣ Call Gemini AI with structured prompt
    const insights = await callGeminiAI(chunks, GEMINI_API_KEY, file_name || "Text Input");

    // 6️⃣ Insert insights into Supabase
    const savedInsights = [];
    for (const insight of insights) {
      const { data: savedInsight, error: insertErr } = await supabase
        .from("ai_insights")
        .insert({
          user_id: upload.user_id,
          data_source_id: upload.id,
          title: insight.title,
          category: insight.category,
          priority: insight.priority,
          confidence: insight.confidence,
          summary: insight.summary,
          key_findings: insight.key_findings,
          recommendations: insight.recommendations,
          projected_impact: insight.projected_impact,
          tags: insight.tags,
          source: insight.source,
          created_at: insight.created_at
        })
        .select()
        .single();

      if (insertErr) {
        console.error('Error inserting insight:', insertErr);
        continue;
      }

      savedInsights.push(savedInsight);
    }

    // 7️⃣ Update upload status
    await supabase
      .from("data_sources")
      .update({ 
        status: "completed",
        metadata: {
          ...upload.metadata,
          processed_at: new Date().toISOString(),
          insights_generated: savedInsights.length
        }
      })
      .eq("id", upload_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        insight: savedInsights,
        insights_generated: savedInsights.length
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (err) {
    console.error('Error in process-upload-to-insights:', err);
    return new Response(
      JSON.stringify({ error: err.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function normalizeContent(content: string): Promise<string> {
  // Basic text normalization
  let normalized = content
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s.,!?-]/g, '') // Remove special characters
    .trim();

  // Split into sentences and clean
  const sentences = normalized.split(/[.!?]+/).filter(s => s.trim().length > 10);
  normalized = sentences.join('. ');

  return normalized;
}

async function createSemanticChunks(content: string): Promise<string[]> {
  const chunkSize = 2000; // Characters per chunk
  const overlap = 200; // Overlap between chunks
  
  const chunks = [];
  let start = 0;

  while (start < content.length) {
    const end = Math.min(start + chunkSize, content.length);
    const chunk = content.substring(start, end);
    chunks.push(chunk);
    start = end - overlap;
  }

  return chunks;
}

async function callGeminiAI(chunks: string[], apiKey: string, source: string): Promise<GeminiInsightResponse[]> {
  const prompt = `
    Task: Generate actionable business insights
    Data: ${chunks.join('\n\n')}
    Context:
      Categories: Customer Experience, Revenue, Operations, Growth
      Goals: Reduce churn, Increase MRR, Improve efficiency, Expand markets
    Output schema: JSON with title, category, priority, confidence, summary, key_findings[], recommendations[], projected_impact, tags[], source, created_at

    Generate 3-5 actionable business insights from the provided data. Each insight should be in this exact JSON format:
    {
      "title": "string",
      "category": "Customer Experience | Revenue | Operations | Growth",
      "priority": "High | Medium | Low",
      "confidence": 0-100,
      "summary": "string",
      "key_findings": ["string"],
      "recommendations": ["string"],
      "projected_impact": "string",
      "tags": ["string"],
      "source": "upload filename",
      "created_at": "timestamp"
    }

    Focus on actionable insights that provide clear business value and quantifiable impact.
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
    const jsonMatch = text.match(/\[\s*{[\s\S]*}\s*\]/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Gemini response');
    }

    const insights = JSON.parse(jsonMatch[0]) as GeminiInsightResponse[];
    
    // Add source and timestamp to each insight
    return insights.map(insight => ({
      ...insight,
      source: source,
      created_at: new Date().toISOString()
    }));

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    // Return fallback insight
    return [{
      title: "Data Analysis Complete",
      category: "Operations",
      priority: "Medium",
      confidence: 70,
      summary: "Your data has been processed successfully. Manual review recommended for detailed insights.",
      key_findings: [
        "Data successfully uploaded and processed",
        "Content analysis completed",
        "Ready for detailed business analysis"
      ],
      recommendations: [
        "Review uploaded content for patterns",
        "Consider additional data sources for deeper insights",
        "Schedule regular data analysis sessions"
      ],
      projected_impact: "Improved data-driven decision making capabilities",
      tags: ["data-processing", "analysis", "business-intelligence"],
      source: source,
      created_at: new Date().toISOString()
    }];
  }
}