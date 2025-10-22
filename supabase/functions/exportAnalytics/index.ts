import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExportRequest {
  analytics_id?: string;
  export_type: 'json' | 'csv' | 'pdf' | 'excel';
  time_range?: 'all' | 'week' | 'month' | 'quarter';
  include_charts?: boolean;
}

function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

function generatePDFContent(analytics: any): string {
  return `
# Analytics Report
Generated: ${new Date().toISOString()}

## Executive Summary
${analytics.executive_summary}

## Key Insights
${analytics.key_insights.map((insight: string, index: number) => `${index + 1}. ${insight}`).join('\n')}

## Performance Metrics
- Positive: ${analytics.performance_metrics.positive}%
- Negative: ${analytics.performance_metrics.negative}%
- Neutral: ${analytics.performance_metrics.neutral}%
- Total Insights: ${analytics.performance_metrics.total_insights}

## Recommended Actions
${analytics.recommended_actions.map((action: string, index: number) => `${index + 1}. ${action}`).join('\n')}

## Business Impact
- Strategic Value: ${analytics.business_impact.strategic_value}/100
- Risk Level: ${analytics.business_impact.risk_level}
- Opportunities: ${analytics.business_impact.opportunities.join(', ')}
- Threats: ${analytics.business_impact.threats.join(', ')}

## Real-time Metrics
- Processing Time: ${analytics.real_time_metrics.processing_time}s
- Data Freshness: ${analytics.real_time_metrics.data_freshness}
- Accuracy Score: ${analytics.real_time_metrics.accuracy_score}%
  `;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse the request body
    const { analytics_id, export_type, time_range = 'all', include_charts = false }: ExportRequest = await req.json()

    // Validate request data
    if (!export_type || !['json', 'csv', 'pdf', 'excel'].includes(export_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid export type. Must be json, csv, pdf, or excel' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let analyticsData;

    if (analytics_id) {
      // Export specific analytics
      const { data, error } = await supabaseClient
        .from('analytics_history')
        .select('*')
        .eq('id', analytics_id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Analytics not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      analyticsData = [data];
    } else {
      // Export all analytics for the user with optional time filtering
      let query = supabaseClient
        .from('analytics_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply time range filter
      if (time_range !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (time_range) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'quarter':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        }
        
        if (startDate) {
          query = query.gte('created_at', startDate.toISOString());
        }
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      analyticsData = data || [];
    }

    if (!analyticsData || analyticsData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No analytics data found for export' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let exportContent: string;
    let contentType: string;
    let fileName: string;

    switch (export_type) {
      case 'json':
        exportContent = JSON.stringify(analyticsData, null, 2);
        contentType = 'application/json';
        fileName = `analytics-${new Date().toISOString().split('T')[0]}.json`;
        break;

      case 'csv':
        // Flatten the analytics data for CSV export
        const flattenedData = analyticsData.map(item => ({
          id: item.id,
          created_at: item.created_at,
          analysis_type: item.analysis_type,
          time_range: item.time_range,
          insights_count: item.insights_count,
          executive_summary: item.analytics_data.executive_summary,
          positive_percentage: item.analytics_data.performance_metrics.positive,
          negative_percentage: item.analytics_data.performance_metrics.negative,
          neutral_percentage: item.analytics_data.performance_metrics.neutral,
          strategic_value: item.analytics_data.business_impact.strategic_value,
          risk_level: item.analytics_data.business_impact.risk_level,
          accuracy_score: item.analytics_data.real_time_metrics.accuracy_score
        }));
        exportContent = convertToCSV(flattenedData);
        contentType = 'text/csv';
        fileName = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'pdf':
        // For PDF, we'll return a markdown-like format that can be converted to PDF on the client
        const pdfContent = analyticsData.map(item => generatePDFContent(item.analytics_data)).join('\n\n---\n\n');
        exportContent = pdfContent;
        contentType = 'text/plain';
        fileName = `analytics-${new Date().toISOString().split('T')[0]}.md`;
        break;

      case 'excel':
        // For Excel, we'll return JSON that can be converted to Excel format on the client
        const excelData = analyticsData.map(item => ({
          'Analytics ID': item.id,
          'Created At': item.created_at,
          'Analysis Type': item.analysis_type,
          'Time Range': item.time_range,
          'Insights Count': item.insights_count,
          'Executive Summary': item.analytics_data.executive_summary,
          'Positive %': item.analytics_data.performance_metrics.positive,
          'Negative %': item.analytics_data.performance_metrics.negative,
          'Neutral %': item.analytics_data.performance_metrics.neutral,
          'Strategic Value': item.analytics_data.business_impact.strategic_value,
          'Risk Level': item.analytics_data.business_impact.risk_level,
          'Accuracy Score': item.analytics_data.real_time_metrics.accuracy_score,
          'Key Insights': item.analytics_data.key_insights.join('; '),
          'Recommended Actions': item.analytics_data.recommended_actions.join('; '),
          'Opportunities': item.analytics_data.business_impact.opportunities.join('; '),
          'Threats': item.analytics_data.business_impact.threats.join('; ')
        }));
        exportContent = JSON.stringify(excelData, null, 2);
        contentType = 'application/json';
        fileName = `analytics-${new Date().toISOString().split('T')[0]}.json`;
        break;

      default:
        throw new Error('Unsupported export type');
    }

    // Return the export data
    return new Response(
      JSON.stringify({
        content: exportContent,
        content_type: contentType,
        file_name: fileName,
        export_type,
        records_count: analyticsData.length,
        generated_at: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in exportAnalytics function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})