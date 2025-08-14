import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { user_id, title, description, report_type, scheduled_for } = await req.json();

    if (!user_id || !title || !report_type) {
      return new Response('Missing required fields', { status: 400 });
    }

    console.log(`🚀 Starting report generation for user ${user_id}: ${title} (${report_type})`);

    // Create report record
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        user_id,
        title,
        description: description || '',
        report_type,
        status: 'processing',
        scheduled_for: scheduled_for || null,
        metadata: {
          started_at: new Date().toISOString(),
          report_type,
          scheduled: !!scheduled_for
        }
      })
      .select()
      .single();

    if (reportError) throw reportError;

    // If scheduled for later, don't process immediately
    if (scheduled_for) {
      console.log(`📅 Report scheduled for ${scheduled_for}`);
      return new Response(JSON.stringify({
        success: true,
        report_id: report.id,
        status: 'scheduled',
        message: 'Report scheduled for generation'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch user's insights for the report
    const { data: insights, error: insightsError } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (insightsError) throw insightsError;

    console.log(`📊 Found ${insights?.length || 0} insights for report`);

    // Generate AI summary of insights
    let aiSummary = '';
    if (insights && insights.length > 0) {
      try {
        const insightsText = insights.map(insight => 
          `${insight.title}: ${insight.description} (Priority: ${insight.priority}, Confidence: ${insight.confidence}%)`
        ).join('\n\n');

        const prompt = `Analyze the following business insights and create a comprehensive executive summary:

${insightsText}

Please provide:
1. Key trends and patterns identified
2. Most critical findings and their business impact
3. Strategic recommendations for action
4. Risk factors and opportunities
5. Next steps and priorities

Format the response as a professional business report summary.`;

        const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GEMINI_API_KEY}`
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }]
          })
        });

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          aiSummary = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'AI analysis unavailable';
        }
      } catch (error) {
        console.error('❌ Gemini API error:', error);
        aiSummary = 'AI analysis temporarily unavailable. Report generated from raw data.';
      }
    }

    // Generate report content based on type
    let reportContent = '';
    let fileName = '';
    let mimeType = '';

    switch (report_type) {
      case 'PDF':
        reportContent = generatePDFContent(title, description, insights, aiSummary);
        fileName = `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        mimeType = 'application/pdf';
        break;
      
      case 'CSV':
        reportContent = generateCSVContent(insights);
        fileName = `${title.replace(/[^a-z0-9]/gi, '_')}.csv`;
        mimeType = 'text/csv';
        break;
      
      case 'XLSX':
        reportContent = generateXLSXContent(insights);
        fileName = `${title.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      
      default:
        throw new Error(`Unsupported report type: ${report_type}`);
    }

    // Upload report file to Supabase Storage
    const filePath = `reports/${user_id}/${Date.now()}_${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(filePath, new TextEncoder().encode(reportContent), {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get file info
    const { data: fileInfo } = await supabase.storage
      .from('reports')
      .list(`reports/${user_id}`);

    const uploadedFile = fileInfo?.find(f => f.name === filePath.split('/').pop());
    const fileSize = uploadedFile?.metadata?.size || 0;

    // Update report status to completed
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        status: 'completed',
        file_url: filePath,
        file_size: fileSize,
        insights_count: insights?.length || 0,
        generated_at: new Date().toISOString(),
        metadata: {
          ...report.metadata,
          completed_at: new Date().toISOString(),
          processing_time: Date.now() - new Date(report.metadata.started_at).getTime(),
          insights_analyzed: insights?.length || 0,
          ai_summary_generated: !!aiSummary
        }
      })
      .eq('id', report.id);

    if (updateError) throw updateError;

    // Update report stats
    await updateReportStats(supabase, user_id);

    console.log(`✅ Report generated successfully: ${fileName}`);

    return new Response(JSON.stringify({
      success: true,
      report_id: report.id,
      status: 'completed',
      file_url: filePath,
      file_size: fileSize,
      message: 'Report generated successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Report generation error:', error);
    
    // Update report status to failed if we have a report ID
    if (error.report_id) {
      try {
        const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
        await supabase
          .from('reports')
          .update({
            status: 'failed',
            metadata: {
              error: error.message,
              failed_at: new Date().toISOString()
            }
          })
          .eq('id', error.report_id);
      } catch (updateError) {
        console.error('❌ Failed to update report status:', updateError);
      }
    }

    return new Response(JSON.stringify({
      error: 'Report generation failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Generate PDF content (simplified - in production, use a proper PDF library)
function generatePDFContent(title: string, description: string, insights: any[], aiSummary: string): string {
  const content = `
# ${title}

${description}

## Executive Summary
${aiSummary}

## Insights Overview
Total Insights: ${insights?.length || 0}

${insights?.map(insight => `
### ${insight.title}
- **Priority**: ${insight.priority}
- **Confidence**: ${insight.confidence}%
- **Category**: ${insight.category}
- **Description**: ${insight.description}
- **Key Findings**: ${insight.key_findings?.join(', ') || 'N/A'}
- **Recommendations**: ${insight.recommendations?.join(', ') || 'N/A'}
- **Projected Impact**: ${insight.projected_impact || 'N/A'}

---
`).join('') || 'No insights available'}

## Generated on: ${new Date().toLocaleDateString()}
Generated by NoteX AI Business Intelligence Platform
  `;

  return content;
}

// Generate CSV content
function generateCSVContent(insights: any[]): string {
  if (!insights || insights.length === 0) {
    return 'Title,Description,Category,Priority,Confidence,Key Findings,Recommendations,Projected Impact,Created At\nNo insights available';
  }

  const headers = ['Title', 'Description', 'Category', 'Priority', 'Confidence', 'Key Findings', 'Recommendations', 'Projected Impact', 'Created At'];
  const rows = insights.map(insight => [
    `"${insight.title}"`,
    `"${insight.description}"`,
    `"${insight.category}"`,
    `"${insight.priority}"`,
    insight.confidence,
    `"${insight.key_findings?.join('; ') || ''}"`,
    `"${insight.recommendations?.join('; ') || ''}"`,
    `"${insight.projected_impact || ''}"`,
    `"${new Date(insight.created_at).toLocaleDateString()}"`
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// Generate XLSX content (simplified - in production, use a proper XLSX library)
function generateXLSXContent(insights: any[]): string {
  // For now, return CSV format as XLSX
  // In production, use a library like 'xlsx' to create proper Excel files
  return generateCSVContent(insights);
}

// Update report statistics
async function updateReportStats(supabase: any, userId: string) {
  try {
    // Get all reports for user
    const { data: reports } = await supabase
      .from('reports')
      .select('created_at, generated_at, status')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (!reports || reports.length === 0) return;

    // Calculate statistics
    const totalReports = reports.length;
    const completedReports = reports.filter(r => r.status === 'completed');
    
    let avgProcessingTime = 0;
    if (completedReports.length > 0) {
      const processingTimes = completedReports
        .filter(r => r.generated_at && r.created_at)
        .map(r => {
          const start = new Date(r.created_at).getTime();
          const end = new Date(r.generated_at).getTime();
          return (end - start) / 1000; // Convert to seconds
        });
      
      if (processingTimes.length > 0) {
        avgProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      }
    }

    const lastGenerated = completedReports
      .filter(r => r.generated_at)
      .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())[0]?.generated_at;

    // Reports by type
    const { data: typeStats } = await supabase
      .from('reports')
      .select('report_type')
      .eq('user_id', userId);

    const reportsByType = typeStats?.reduce((acc: any, report: any) => {
      acc[report.report_type] = (acc[report.report_type] || 0) + 1;
      return acc;
    }, {}) || {};

    // Reports by status
    const { data: statusStats } = await supabase
      .from('reports')
      .select('status')
      .eq('user_id', userId);

    const reportsByStatus = statusStats?.reduce((acc: any, report: any) => {
      acc[report.status] = (acc[report.status] || 0) + 1;
      return acc;
    }, {}) || {};

    // Upsert report stats
    await supabase
      .from('report_stats')
      .upsert({
        user_id: userId,
        total_reports: totalReports,
        avg_processing_time: Math.round(avgProcessingTime),
        last_generated_at: lastGenerated,
        reports_by_type: Object.entries(reportsByType).map(([type, count]) => ({ type, count })),
        reports_by_status: Object.entries(reportsByStatus).map(([status, count]) => ({ status, count })),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

  } catch (error) {
    console.error('❌ Error updating report stats:', error);
  }
}