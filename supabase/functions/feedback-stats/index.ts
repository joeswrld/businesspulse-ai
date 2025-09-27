import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get project ID from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const projectId = pathParts[pathParts.length - 1]

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Project ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get query parameters for date range
    const searchParams = url.searchParams
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // Build query
    let query = supabaseClient
      .from('feedback')
      .select('*')
      .eq('project_id', projectId)

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Execute query
    const { data: feedbacks, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching feedback stats:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch feedback statistics' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Calculate statistics
    const totalFeedback = feedbacks?.length || 0
    const customerSatisfactionCount = feedbacks?.filter(f => f.form_type === 'customer_satisfaction').length || 0
    const productFeedbackCount = feedbacks?.filter(f => f.form_type === 'product_feedback').length || 0

    // Calculate average rating
    const ratings = feedbacks?.filter(f => f.rating).map(f => f.rating) || []
    const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0

    // Rating distribution
    const ratingDistribution: { [key: number]: number } = {}
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = ratings.filter(r => r === i).length
    }

    // Recent feedback (last 10)
    const recentFeedback = feedbacks?.slice(0, 10) || []

    // Time series data (grouped by date)
    const timeSeriesData: { [key: string]: number } = {}
    feedbacks?.forEach(feedback => {
      const date = new Date(feedback.created_at).toISOString().split('T')[0]
      timeSeriesData[date] = (timeSeriesData[date] || 0) + 1
    })

    const timeSeries = Object.entries(timeSeriesData)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Response data
    const stats = {
      totalFeedback,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      customerSatisfactionCount,
      productFeedbackCount,
      ratingDistribution,
      recentFeedback,
      timeSeries,
      dateRange: {
        start: startDate || null,
        end: endDate || null
      }
    }

    return new Response(
      JSON.stringify(stats),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})