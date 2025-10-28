import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessUploadRequest {
  data_source_id: string;
  user_id: string;
  file_url?: string;
  file_type?: string;
  text_content?: string;
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { data_source_id, user_id, file_url, file_type, text_content } = await req.json() as ProcessUploadRequest;

    if (!data_source_id || !user_id) {
      throw new Error('Missing required parameters');
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

    // Update data source status to processing
    await supabase
      .from('data_sources')
      .update({ status: 'processing' })
      .eq('id', data_source_id);

    let extractedContent = '';

    if (text_content) {
      // Process text input directly
      extractedContent = text_content;
    } else if (file_url && file_type) {
      // Download and process file
      const fileResponse = await fetch(file_url);
      if (!fileResponse.ok) {
        throw new Error('Failed to download file');
      }

      const fileBuffer = await fileResponse.arrayBuffer();
      
      // Extract text based on file type
      if (file_type.includes('pdf')) {
        // For PDFs, we'd need a PDF parser library
        // For now, we'll simulate text extraction
        extractedContent = `Extracted text from PDF file. Content length: ${fileBuffer.byteLength} bytes.`;
      } else if (file_type.includes('csv') || file_type.includes('excel') || file_type.includes('spreadsheet')) {
        // For CSV/Excel, parse as text for now
        const textDecoder = new TextDecoder();
        extractedContent = textDecoder.decode(fileBuffer);
      } else if (file_type.includes('text') || file_type.includes('txt')) {
        const textDecoder = new TextDecoder();
        extractedContent = textDecoder.decode(fileBuffer);
      } else {
        // For other file types, try to extract as text
        const textDecoder = new TextDecoder();
        extractedContent = textDecoder.decode(fileBuffer);
      }
    }

    if (!extractedContent.trim()) {
      throw new Error('No content extracted from file');
    }

    // Clean and normalize content
    const normalizedContent = await normalizeContent(extractedContent);

    // Create normalized document
    const { data: normalizedDoc, error: docError } = await supabase
      .from('normalized_docs')
      .insert({
        user_id,
        data_source_id,
        content: {
          original: extractedContent,
          normalized: normalizedContent,
          metadata: {
            file_type,
            processing_timestamp: new Date().toISOString(),
            content_length: extractedContent.length
          }
        },
        processing_status: 'completed'
      })
      .select()
      .single();

    if (docError) {
      throw new Error(`Failed to create normalized document: ${docError.message}`);
    }

    // Create document chunks and embeddings
    const chunks = await createChunks(normalizedContent, normalizedDoc.id, user_id, supabase);

    // Generate AI insights using Gemini
    const insights = await generateInsights(normalizedContent, user_id, data_source_id, geminiApiKey, supabase);

    // Update data source status to completed
    await supabase
      .from('data_sources')
      .update({ 
        status: 'completed',
        metadata: {
          processed_at: new Date().toISOString(),
          chunks_created: chunks.length,
          insights_generated: insights.length
        }
      })
      .eq('id', data_source_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'File processed successfully',
        data: {
          normalized_doc_id: normalizedDoc.id,
          chunks_created: chunks.length,
          insights_generated: insights.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error processing upload:', error);
    
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

async function createChunks(content: string, docId: string, userId: string, supabase: any): Promise<any[]> {
  const chunkSize = 1000; // Characters per chunk
  const overlap = 200; // Overlap between chunks
  
  const chunks = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < content.length) {
    const end = Math.min(start + chunkSize, content.length);
    const chunk = content.substring(start, end);
    
    // Create embedding using Gemini
    const embedding = await createEmbedding(chunk);
    
    // Store chunk with embedding
    const { data: chunkData, error } = await supabase
      .from('doc_chunks')
      .insert({
        normalized_doc_id: docId,
        user_id: userId,
        content: chunk,
        embedding,
        chunk_index: chunkIndex,
        metadata: {
          start_char: start,
          end_char: end,
          chunk_size: chunk.length
        }
      })
      .select()
      .single();

    if (!error && chunkData) {
      chunks.push(chunkData);
    }

    start = end - overlap;
    chunkIndex++;
  }

  return chunks;
}

async function createEmbedding(text: string): Promise<number[]> {
  // This would call Gemini's embedding API
  // For now, return a placeholder vector
  const vector = new Array(1536).fill(0).map(() => Math.random() - 0.5);
  return vector;
}

async function generateInsights(content: string, userId: string, dataSourceId: string, geminiApiKey: string, supabase: any): Promise<any[]> {
  const prompt = `
    Analyze the following business data and provide actionable insights in JSON format:
    
    ${content.substring(0, 4000)} // Limit content length
    
    Please provide insights in this exact JSON format:
    {
      "insights": [
        {
          "title": "Insight title",
          "summary": "Brief summary",
          "insight_type": "business_opportunity|risk_alert|trend_analysis|operational_insight",
          "priority": "low|medium|high|urgent",
          "confidence_score": 0.85,
          "content": {
            "key_findings": ["Finding 1", "Finding 2"],
            "recommendations": ["Recommendation 1", "Recommendation 2"],
            "projected_impact": "High impact on revenue",
            "tags": ["tag1", "tag2"]
          }
        }
      ]
    }
    
    Focus on business value, actionable recommendations, and quantifiable impact.
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
    const insights = insightsData.insights || [];

    // Store insights in database
    const storedInsights = [];
    for (const insight of insights) {
      const { data: insightData, error } = await supabase
        .from('ai_insights')
        .insert({
          user_id: userId,
          data_source_id: dataSourceId,
          title: insight.title,
          summary: insight.summary,
          insight_type: insight.insight_type,
          priority: insight.priority,
          confidence_score: insight.confidence_score,
          content: insight.content
        })
        .select()
        .single();

      if (!error && insightData) {
        storedInsights.push(insightData);
      }
    }

    return storedInsights;

  } catch (error) {
    console.error('Error generating insights:', error);
    // Return empty array if insight generation fails
    return [];
  }
}