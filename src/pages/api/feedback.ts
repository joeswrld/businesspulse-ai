import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { project_id, user_email, content, rating, metadata } = req.body;

    // Validate required fields
    if (!project_id || !content) {
      return res.status(400).json({ error: 'Project ID and content are required' });
    }

    // Validate email format if provided
    if (user_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user_email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Prepare feedback data
    const feedbackData = {
      project_id,
      user_email: user_email?.trim() || null,
      content: content.trim(),
      metadata: {
        ...metadata,
        rating: rating || null,
        form_type: 'widget',
        submitted_at: new Date().toISOString()
      },
      session_id: metadata?.session_id || null
    };

    // Insert feedback into database
    const { data, error } = await supabase
      .from('feedback')
      .insert(feedbackData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to save feedback' });
    }

    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        id: data.id,
        message: 'Feedback submitted successfully'
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}