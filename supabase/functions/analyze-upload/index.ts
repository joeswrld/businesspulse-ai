import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_ENDPOINT = Deno.env.get('GEMINI_ENDPOINT')!;
const GEMINI_KEY = Deno.env.get('GEMINI_KEY')!;

Deno.serve(async (req) => {
  try {
    const { upload_id } = await req.json();
    
    if (!upload_id) {
      return new Response(JSON.stringify({ error: 'upload_id is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get upload details
    const { data: upload, error } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', upload_id)
      .single();
    
    if (error || !upload) {
      throw new Error(error?.message ?? 'Upload not found');
    }

    // Mark as processing
    await supabase
      .from('uploads')
      .update({ status: 'processing' })
      .eq('id', upload_id);

    let rawText = '';
    
    if (upload.kind === 'text') {
      rawText = upload.text_content ?? '';
    } else {
      // File upload: get signed URL and prepare for analysis
      const { data: signed } = await supabase
        .storage
        .from('uploads')
        .createSignedUrl(upload.storage_path, 60 * 10); // 10 minutes
      
      if (!signed?.signedUrl) {
        throw new Error('Could not generate signed URL for file');
      }

      // For file analysis, send file metadata and URL
      rawText = `FILE_ANALYSIS_REQUEST:
File: ${upload.filename}
Type: ${upload.mime_type}
Size: ${upload.size_bytes} bytes
URL: ${signed.signedUrl}

Please analyze this file and provide business insights.`;
    }

    if (!rawText.trim()) {
      throw new Error('No content to analyze');
    }

    // Call Gemini API for analysis
    const payload = {
      prompt: `You are an AI business analyst for NoteX. Analyze the following data and provide insights in this exact JSON format:

{
  "summary": "A concise 2-3 sentence summary of the key findings",
  "bullets": [
    "Key insight point 1",
    "Key insight point 2", 
    "Key insight point 3"
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2"
  ],
  "business_impact": "High/Medium/Low - brief explanation"
}

Data to analyze:
${rawText}

Return only valid JSON, no additional text.`
    };

    const aiResponse = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${GEMINI_KEY}` 
      },
      body: JSON.stringify(payload)
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status} ${aiResponse.statusText}`);
    }

    const aiJson = await aiResponse.json();
    
    // Extract insights safely
    const summary = aiJson.summary ?? 'Analysis completed';
    const details = {
      bullets: aiJson.bullets ?? [],
      recommendations: aiJson.recommendations ?? [],
      business_impact: aiJson.business_impact ?? 'Medium'
    };

    // Create insight record
    const { error: insightError } = await supabase
      .from('insights')
      .insert({
        upload_id,
        user_id: upload.user_id,
        summary,
        details
      });

    if (insightError) {
      throw new Error(`Failed to save insight: ${insightError.message}`);
    }

    // Update upload status to completed
    await supabase
      .from('uploads')
      .update({
        status: 'done',
        processed_at: new Date().toISOString(),
        error_message: null
      })
      .eq('id', upload_id);

    // Update system status
    await supabase
      .from('system_status')
      .update({
        status: 'healthy',
        message: 'AI processing completed successfully',
        updated_at: new Date().toISOString()
      })
      .eq('component', 'ai_processing');

    return new Response(JSON.stringify({ 
      ok: true, 
      message: 'Analysis completed successfully',
      insight: { summary, details }
    }), { 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
    // Try to update upload with error status
    try {
      const { upload_id } = await req.json();
      if (upload_id) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        await supabase
          .from('uploads')
          .update({ 
            status: 'error', 
            error_message: String(error) 
          })
          .eq('id', upload_id);

        // Update system status to error
        await supabase
          .from('system_status')
          .update({
            status: 'error',
            message: `AI processing error: ${String(error)}`,
            updated_at: new Date().toISOString()
          })
          .eq('component', 'ai_processing');
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    return new Response(JSON.stringify({ 
      ok: false, 
      error: String(error) 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' } 
    });
  }
});