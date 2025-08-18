import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Data preprocessing functions
const normalizeText = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .replace(/[^\w\s\n.,!?;:()\-'"]/g, '') // Remove special characters except basic punctuation
    .substring(0, 50000); // Limit to 50,000 characters
};

const categorizeContent = (text: string): string[] => {
  const categories = [];
  const lowerText = text.toLowerCase();
  
  // Feedback indicators
  if (lowerText.includes('feedback') || lowerText.includes('review') || lowerText.includes('experience')) {
    categories.push('feedback');
  }
  
  // Complaint indicators
  if (lowerText.includes('problem') || lowerText.includes('issue') || lowerText.includes('bug') || 
      lowerText.includes('error') || lowerText.includes('broken') || lowerText.includes('doesn\'t work')) {
    categories.push('complaint');
  }
  
  // Suggestion indicators
  if (lowerText.includes('suggest') || lowerText.includes('could') || lowerText.includes('would like') || 
      lowerText.includes('feature') || lowerText.includes('improvement') || lowerText.includes('add')) {
    categories.push('suggestion');
  }
  
  // Praise indicators
  if (lowerText.includes('great') || lowerText.includes('amazing') || lowerText.includes('excellent') || 
      lowerText.includes('love') || lowerText.includes('perfect') || lowerText.includes('awesome')) {
    categories.push('praise');
  }
  
  return categories.length > 0 ? categories : ['general'];
};

const chunkText = (text: string, maxChunkSize: number = 3000): string[] => {
  const chunks = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        // Single sentence is too long, split by words
        const words = trimmedSentence.split(' ');
        let wordChunk = '';
        for (const word of words) {
          if (wordChunk.length + word.length > maxChunkSize) {
            if (wordChunk) {
              chunks.push(wordChunk.trim());
              wordChunk = word;
            } else {
              chunks.push(word);
            }
          } else {
            wordChunk += (wordChunk ? ' ' : '') + word;
          }
        }
        if (wordChunk) {
          currentChunk = wordChunk;
        }
      }
    } else {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [text];
};

const createStructuredPrompt = (data: string, categories: string[]): string => {
  const categoryText = categories.join(', ');
  
  return `You are an expert business analyst specializing in customer feedback analysis. Your task is to analyze user feedback and provide structured, actionable insights.

INPUT DATA:
${data}

CONTENT CATEGORIES: ${categoryText}

ANALYSIS REQUIREMENTS:
Please analyze the above feedback and return a JSON object with the following structure:

{
  "summary": "A concise 2-3 sentence executive summary of the main points",
  "sentiment": {
    "overall": "positive|negative|neutral",
    "confidence": 0.85,
    "breakdown": {
      "positive": 0.6,
      "negative": 0.2,
      "neutral": 0.2
    }
  },
  "themes": [
    {
      "name": "Specific theme or topic name",
      "frequency": 5,
      "sentiment": "positive|negative|neutral",
      "examples": ["exact quote 1", "exact quote 2"]
    }
  ],
  "suggestions": [
    {
      "action": "Specific, actionable recommendation",
      "priority": "high|medium|low",
      "category": "feature|support|bug|improvement|process",
      "impact": "high|medium|low",
      "effort": "high|medium|low"
    }
  ],
  "trends": {
    "sentiment_trend": "improving|declining|stable",
    "key_insights": ["insight 1", "insight 2", "insight 3"]
  },
  "metrics": {
    "total_feedback_count": 1,
    "positive_ratio": 0.6,
    "negative_ratio": 0.2,
    "neutral_ratio": 0.2
  }
}

ANALYSIS GUIDELINES:
1. Focus on extracting actionable business insights
2. Identify specific themes and topics mentioned
3. Provide concrete, implementable suggestions
4. Assess priority based on impact and frequency
5. Consider business impact and effort required
6. Be specific with examples and quotes
7. Ensure all suggestions are actionable

Return ONLY valid JSON. Do not include any explanatory text outside the JSON structure.`;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { data } = await req.json()
    
    if (!data) {
      throw new Error('No data provided')
    }

    // Get Gemini API key from environment
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Step 1: Normalize the input data
    const normalizedData = normalizeText(data);
    
    // Step 2: Categorize the content
    const categories = categorizeContent(normalizedData);
    
    // Step 3: Chunk large datasets
    const chunks = chunkText(normalizedData);
    
    // Step 4: Create structured prompt
    const prompt = createStructuredPrompt(normalizedData, categories);

    console.log(`Processing ${chunks.length} chunk(s) with categories: ${categories.join(', ')}`);

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
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
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const result = await response.json()
    const generatedText = result.candidates[0].content.parts[0].text

    // Extract JSON from Gemini response
    let insights
    try {
      // Try to find JSON in the response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', generatedText)
      // Fallback to basic analysis with structured format
      const sentiment = normalizedData.toLowerCase().includes('great') || 
                       normalizedData.toLowerCase().includes('amazing') || 
                       normalizedData.toLowerCase().includes('love') ? 'positive' : 
                       normalizedData.toLowerCase().includes('problem') || 
                       normalizedData.toLowerCase().includes('issue') || 
                       normalizedData.toLowerCase().includes('bug') ? 'negative' : 'neutral';
      
      insights = {
        summary: `Analysis of ${categories.join(', ')} content: ${normalizedData.substring(0, 100)}...`,
        sentiment: {
          overall: sentiment,
          confidence: 0.7,
          breakdown: {
            positive: sentiment === 'positive' ? 1 : 0,
            negative: sentiment === 'negative' ? 1 : 0,
            neutral: sentiment === 'neutral' ? 1 : 0
          }
        },
        themes: [{
          name: categories[0] || 'General Feedback',
          frequency: 1,
          sentiment: sentiment,
          examples: [normalizedData.substring(0, 100)]
        }],
        suggestions: [{
          action: `Review ${categories.join(', ')} feedback for improvement opportunities`,
          priority: 'medium',
          category: 'improvement',
          impact: 'medium',
          effort: 'medium'
        }],
        trends: {
          sentiment_trend: 'stable',
          key_insights: [`Content categorized as: ${categories.join(', ')}`]
        },
        metrics: {
          total_feedback_count: chunks.length,
          positive_ratio: sentiment === 'positive' ? 1 : 0,
          negative_ratio: sentiment === 'negative' ? 1 : 0,
          neutral_ratio: sentiment === 'neutral' ? 1 : 0
        }
      }
    }

    // Add processing metadata
    insights.processing_metadata = {
      chunks_processed: chunks.length,
      categories_detected: categories,
      original_length: data.length,
      normalized_length: normalizedData.length
    };

    return new Response(
      JSON.stringify({
        success: true,
        result: insights
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})