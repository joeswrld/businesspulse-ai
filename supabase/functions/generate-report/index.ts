import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateReportRequest {
  user_id: string;
  insight_ids: string[];
  format: 'pdf' | 'csv';
  title: string;
  date_range_start?: string;
  date_range_end?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id, insight_ids, format, title, date_range_start, date_range_end } = await req.json() as GenerateReportRequest;

    if (!user_id || !insight_ids || !format || !title) {
      throw new Error('Missing required parameters');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch insights data
    const { data: insights, error: insightsError } = await supabase
      .from('ai_insights')
      .select('*')
      .in('id', insight_ids)
      .eq('user_id', user_id);

    if (insightsError) {
      throw new Error(`Failed to fetch insights: ${insightsError.message}`);
    }

    if (!insights || insights.length === 0) {
      throw new Error('No insights found');
    }

    // Create report record
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        user_id,
        title,
        type: 'insights_report',
        format,
        status: 'processing',
        insights_included: insights.length,
        date_range_start,
        date_range_end
      })
      .select()
      .single();

    if (reportError) {
      throw new Error(`Failed to create report: ${reportError.message}`);
    }

    let reportContent: string;
    let fileExtension: string;
    let mimeType: string;

    if (format === 'csv') {
      reportContent = generateCSVReport(insights);
      fileExtension = 'csv';
      mimeType = 'text/csv';
    } else {
      reportContent = generatePDFReport(insights, title);
      fileExtension = 'pdf';
      mimeType = 'application/pdf';
    }

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `report_${title.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${fileExtension}`;

    // Upload report to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('reports')
      .upload(`${user_id}/${filename}`, reportContent, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to upload report: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('reports')
      .getPublicUrl(`${user_id}/${filename}`);

    // Update report with file details
    await supabase
      .from('reports')
      .update({
        status: 'completed',
        file_url: urlData.publicUrl,
        file_size: reportContent.length
      })
      .eq('id', report.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Report generated successfully',
        data: {
          report_id: report.id,
          file_url: urlData.publicUrl,
          filename,
          insights_count: insights.length
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error generating report:', error);
    
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

function generateCSVReport(insights: any[]): string {
  const headers = [
    'Title',
    'Summary',
    'Type',
    'Priority',
    'Confidence Score',
    'Key Findings',
    'Recommendations',
    'Projected Impact',
    'Tags',
    'Created At'
  ];

  const rows = insights.map(insight => [
    `"${insight.title}"`,
    `"${insight.summary || ''}"`,
    insight.insight_type,
    insight.priority || 'medium',
    insight.confidence_score || 0,
    `"${(insight.content?.key_findings || []).join('; ')}"`,
    `"${(insight.content?.recommendations || []).join('; ')}"`,
    `"${insight.content?.projected_impact || ''}"`,
    `"${(insight.content?.tags || []).join(', ')}"`,
    new Date(insight.created_at).toISOString()
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

function generatePDFReport(insights: any[], title: string): string {
  // For now, return a simple HTML-like structure that can be converted to PDF
  // In production, you'd use a proper PDF generation library
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 40px; }
        .insight { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .insight-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; color: #333; }
        .insight-meta { color: #666; margin-bottom: 15px; }
        .insight-content { line-height: 1.6; }
        .priority-high { border-left: 4px solid #ef4444; }
        .priority-medium { border-left: 4px solid #f59e0b; }
        .priority-low { border-left: 4px solid #10b981; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
        <p>Total Insights: ${insights.length}</p>
      </div>
      
      ${insights.map(insight => `
        <div class="insight priority-${insight.priority || 'medium'}">
          <div class="insight-title">${insight.title}</div>
          <div class="insight-meta">
            Type: ${insight.insight_type} | 
            Priority: ${insight.priority || 'medium'} | 
            Confidence: ${Math.round((insight.confidence_score || 0) * 100)}% |
            Created: ${new Date(insight.created_at).toLocaleDateString()}
          </div>
          <div class="insight-content">
            <p><strong>Summary:</strong> ${insight.summary || 'No summary available'}</p>
            
            ${insight.content?.key_findings && insight.content.key_findings.length > 0 ? `
              <p><strong>Key Findings:</strong></p>
              <ul>
                ${insight.content.key_findings.map((finding: string) => `<li>${finding}</li>`).join('')}
              </ul>
            ` : ''}
            
            ${insight.content?.recommendations && insight.content.recommendations.length > 0 ? `
              <p><strong>Recommendations:</strong></p>
              <ul>
                ${insight.content.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
              </ul>
            ` : ''}
            
            ${insight.content?.projected_impact ? `
              <p><strong>Projected Impact:</strong> ${insight.content.projected_impact}</p>
            ` : ''}
            
            ${insight.content?.tags && insight.content.tags.length > 0 ? `
              <p><strong>Tags:</strong> ${insight.content.tags.join(', ')}</p>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </body>
    </html>
  `;

  return htmlContent;
}