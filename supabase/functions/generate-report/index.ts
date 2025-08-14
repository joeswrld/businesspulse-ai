import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_ENDPOINT = Deno.env.get('GEMINI_ENDPOINT')!;
const GEMINI_KEY = Deno.env.get('GEMINI_KEY')!;

Deno.serve(async (req) => {
  try {
    const { user_id, report_type = 'PDF', title, description } = await req.json();
    
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

    const startTime = Date.now();

    // 1. Create initial report record with processing status
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        user_id,
        title: title || `AI Insights Report - ${new Date().toLocaleDateString()}`,
        description: description || 'Comprehensive analysis of your AI insights',
        report_type,
        status: 'processing'
      })
      .select('*')
      .single();

    if (reportError) {
      throw new Error(`Failed to create report: ${reportError.message}`);
    }

    // 2. Fetch user's AI insights for the report
    const { data: insights, error: insightsError } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (insightsError) {
      throw new Error(`Failed to fetch insights: ${insightsError.message}`);
    }

    if (!insights || insights.length === 0) {
      // Update report status to failed
      await supabase
        .from('reports')
        .update({ 
          status: 'failed',
          description: 'No insights found to generate report'
        })
        .eq('id', report.id);

      return new Response(JSON.stringify({ 
        error: 'No insights found to generate report' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 3. Generate report content based on type
    let reportContent: string;
    let fileName: string;
    let mimeType: string;

    if (report_type === 'CSV') {
      // Generate CSV content
      const csvHeaders = ['Title', 'Category', 'Priority', 'Confidence', 'Description', 'Tags', 'Created At'];
      const csvRows = insights.map(insight => [
        `"${insight.title}"`,
        insight.category,
        insight.priority,
        insight.confidence,
        `"${insight.description}"`,
        `"${insight.tags.join(', ')}"`,
        new Date(insight.created_at).toLocaleDateString()
      ]);
      
      reportContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
      fileName = `ai-insights-${Date.now()}.csv`;
      mimeType = 'text/csv';
    } else if (report_type === 'XLSX') {
      // Generate XLSX content (simplified - in production you'd use a proper XLSX library)
      const csvContent = [
        ['Title', 'Category', 'Priority', 'Confidence', 'Description', 'Tags', 'Created At'],
        ...insights.map(insight => [
          insight.title,
          insight.category,
          insight.priority,
          insight.confidence,
          insight.description,
          insight.tags.join(', '),
          new Date(insight.created_at).toLocaleDateString()
        ])
      ];
      
      // Convert to tab-separated format for Excel
      reportContent = csvContent.map(row => row.join('\t')).join('\n');
      fileName = `ai-insights-${Date.now()}.xlsx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      // Generate PDF content (simplified - in production you'd use a proper PDF library)
      const pdfContent = `
AI Insights Report
Generated on: ${new Date().toLocaleDateString()}
Total Insights: ${insights.length}

${insights.map((insight, index) => `
${index + 1}. ${insight.title}
   Category: ${insight.category}
   Priority: ${insight.priority}
   Confidence: ${insight.confidence}%
   Description: ${insight.description}
   Tags: ${insight.tags.join(', ')}
   Created: ${new Date(insight.created_at).toLocaleDateString()}
   
   Key Findings:
   ${insight.key_findings.map(finding => `   • ${finding}`).join('\n')}
   
   Recommendations:
   ${insight.recommendations.map(rec => `   • ${rec}`).join('\n')}
   
   Projected Impact: ${insight.projected_impact}
   
   ---
`).join('')}
      `.trim();
      
      reportContent = pdfContent;
      fileName = `ai-insights-${Date.now()}.pdf`;
      mimeType = 'application/pdf';
    }

    // 4. Upload report file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('reports')
      .upload(`${user_id}/${fileName}`, new TextEncoder().encode(reportContent), {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to upload report: ${uploadError.message}`);
    }

    // 5. Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('reports')
      .getPublicUrl(`${user_id}/${fileName}`);

    // 6. Update report with completed status and file details
    const processingTime = Math.round((Date.now() - startTime) / 1000);
    
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        status: 'done',
        file_url: urlData.publicUrl,
        file_size: new TextEncoder().encode(reportContent).length,
        processing_time_seconds: processingTime
      })
      .eq('id', report.id);

    if (updateError) {
      throw new Error(`Failed to update report: ${updateError.message}`);
    }

    // 7. Generate AI summary if needed (optional enhancement)
    if (insights.length > 0) {
      try {
        const aiPrompt = `Analyze these ${insights.length} AI insights and provide a 2-3 sentence executive summary for a business report. Focus on key trends, priorities, and actionable insights.`;
        
        const aiResponse = await fetch(GEMINI_ENDPOINT, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${GEMINI_KEY}` 
          },
          body: JSON.stringify({ prompt: aiPrompt })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          if (aiData.summary) {
            // Update report with AI-generated summary
            await supabase
              .from('reports')
              .update({ description: aiData.summary })
              .eq('id', report.id);
          }
        }
      } catch (aiError) {
        console.log('AI summary generation failed, continuing without it:', aiError);
      }
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      message: 'Report generated successfully',
      report: {
        id: report.id,
        status: 'done',
        file_url: urlData.publicUrl,
        processing_time: processingTime
      }
    }), { 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Report generation error:', error);
    
    return new Response(JSON.stringify({ 
      ok: false, 
      error: String(error) 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' } 
    });
  }
});