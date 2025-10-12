import { createClient } from '@supabase/supabase-js'
import { analyzeFeedback } from '../../src/lib/gemini'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { workspace, content, rating, type, user_name, user_email, page_url, user_agent } = req.body

    if (!workspace || !content) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Get workspace ID
    const { data: workspaceData, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', workspace)
      .single()

    if (workspaceError || !workspaceData) {
      return res.status(404).json({ message: 'Workspace not found' })
    }

    // Analyze feedback with AI
    let aiAnalysis = null
    try {
      aiAnalysis = await analyzeFeedback(content)
    } catch (error) {
      console.error('AI analysis failed:', error)
      // Continue without AI analysis
    }

    // Create feedback record
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback')
      .insert({
        workspace_id: workspaceData.id,
        content,
        rating: rating || null,
        type: type || 'other',
        user_name: user_name || null,
        user_email: user_email || null,
        user_ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        sentiment: aiAnalysis?.sentiment || null,
        ai_summary: aiAnalysis?.summary || null,
        suggested_reply: aiAnalysis?.suggested_reply || null,
        tags: aiAnalysis?.tags || null,
        page_url: page_url || null,
        user_agent: user_agent || null,
        status: 'new'
      })
      .select()
      .single()

    if (feedbackError) {
      console.error('Error creating feedback:', feedbackError)
      return res.status(500).json({ message: 'Failed to save feedback' })
    }

    // Create notification for workspace owner
    const { data: workspaceOwner } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceData.id)
      .single()

    if (workspaceOwner) {
      await supabase
        .from('notifications')
        .insert({
          user_id: workspaceOwner.owner_id,
          workspace_id: workspaceData.id,
          type: 'new_feedback',
          title: 'New Feedback Received',
          message: `New ${type} feedback: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`
        })
    }

    res.status(200).json({ message: 'Feedback submitted successfully', id: feedback.id })
  } catch (error) {
    console.error('Feedback API error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}