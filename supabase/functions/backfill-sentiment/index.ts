import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackfillRequest {
  user_id: string;
  batch_size?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, batch_size = 10 }: BackfillRequest = await req.json();

    if (!user_id) {
      throw new Error('Missing required parameter: user_id');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's project IDs
    const { data: settingsData, error: settingsError } = await supabase
      .from('feedback_settings')
      .select('project_id')
      .eq('user_id', user_id);

    if (settingsError) {
      throw new Error(`Error fetching feedback settings: ${settingsError.message}`);
    }

    const projectIds = settingsData?.map(s => s.project_id) || [];
    
    if (projectIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No feedback projects found for user',
          processed: 0,
          updated: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Get feedback entries that need sentiment analysis
    const { data: feedbacks, error: feedbacksError } = await supabase
      .from('feedback')
      .select('id, message, sentiment')
      .in('project_id', projectIds)
      .or('sentiment.is.null,sentiment.eq.unknown')
      .limit(batch_size);

    if (feedbacksError) {
      throw new Error(`Error fetching feedbacks: ${feedbacksError.message}`);
    }

    if (!feedbacks || feedbacks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No feedback entries need sentiment analysis',
          processed: 0,
          updated: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log(`Processing ${feedbacks.length} feedback entries for sentiment analysis`);

    let updatedCount = 0;
    const errors: string[] = [];

    // Process each feedback entry
    for (const feedback of feedbacks) {
      try {
        const sentiment = await analyzeSentimentWithGemini(feedback.message);
        const finalSentiment = sentiment || 'neutral';

        // Update the feedback entry
        const { error: updateError } = await supabase
          .from('feedback')
          .update({ sentiment: finalSentiment })
          .eq('id', feedback.id);

        if (updateError) {
          console.error(`Error updating feedback ${feedback.id}:`, updateError);
          errors.push(`Failed to update feedback ${feedback.id}: ${updateError.message}`);
        } else {
          updatedCount++;
          console.log(`Updated feedback ${feedback.id} with sentiment: ${finalSentiment}`);
        }
      } catch (error) {
        console.error(`Error processing feedback ${feedback.id}:`, error);
        errors.push(`Failed to process feedback ${feedback.id}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${feedbacks.length} feedback entries`,
        processed: feedbacks.length,
        updated: updatedCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in backfill-sentiment:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function analyzeSentimentWithGemini(message: string): Promise<string | null> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not found');
    return null;
  }

  const prompt = `Analyze the sentiment of the following feedback message and return ONLY one of these three words: positive, negative, or neutral.

Feedback message: "${message}"

Rules:
- "positive" for praise, satisfaction, compliments, or positive experiences
- "negative" for complaints, criticism, dissatisfaction, or negative experiences  
- "neutral" for factual statements, questions, suggestions, or mixed/unclear sentiment

Return only the single word (positive, negative, or neutral) with no other text.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.1,
          maxOutputTokens: 10,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const responseData = await response.json();
    
    if (!responseData.candidates || !responseData.candidates[0] || !responseData.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const text = responseData.candidates[0].content.parts[0].text.trim().toLowerCase();
    
    // Validate the response
    if (['positive', 'negative', 'neutral'].includes(text)) {
      return text;
    } else {
      console.error('Invalid sentiment response from Gemini:', text);
      return null;
    }

  } catch (error) {
    console.error('Error calling Gemini API for sentiment analysis:', error);
    return null;
  }
}