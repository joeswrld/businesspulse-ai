import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/integrations/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Only POST requests are accepted.'
    });
  }

  try {
    // Parse and validate request body
    const { project_id } = req.body;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'project_id is required'
      });
    }

    // Validate project_id format (should be a valid UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(project_id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project_id format'
      });
    }

    // Check if link already exists for this project
    const { data: existingLink, error: fetchError } = await supabase
      .from('whatsapp_links')
      .select('link')
      .eq('project_id', project_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing WhatsApp link:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to check existing links'
      });
    }

    // If link already exists, return it
    if (existingLink) {
      return res.status(200).json({
        success: true,
        link: existingLink.link
      });
    }

    // Generate new WhatsApp link
    const whatsappLink = `https://notex.com.ng/wa-feedback/${project_id}`;

    // Insert new link into database
    const { data: newLink, error: insertError } = await supabase
      .from('whatsapp_links')
      .insert({
        project_id: project_id,
        link: whatsappLink
      })
      .select('link')
      .single();

    if (insertError) {
      console.error('Error inserting WhatsApp link:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create WhatsApp link'
      });
    }

    // Return the generated link
    return res.status(200).json({
      success: true,
      link: newLink.link
    });

  } catch (error) {
    console.error('Unexpected error in whatsapp-link API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
