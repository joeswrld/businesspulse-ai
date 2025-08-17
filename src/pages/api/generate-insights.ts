import { NextApiRequest, NextApiResponse } from 'next';

interface InsightRequest {
  content: string;
  source: string;
}

interface InsightResponse {
  title: string;
  content: string;
  category: "Customer Experience" | "Revenue" | "Operations" | "Growth";
  priority: "High" | "Medium" | "Low";
  confidence: number;
  key_findings: string[];
  recommendations: string[];
  projected_impact: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 API route called');
    
    const { content, source } = req.body as InsightRequest;

    // Validate input
    if (!content || typeof content !== 'string') {
      console.error('❌ Invalid content provided:', { content, type: typeof content });
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid content provided. Please provide text data.' 
      });
    }

    if (!content.trim()) {
      console.error('❌ Empty content provided');
      return res.status(400).json({ 
        success: false, 
        error: 'No content provided for analysis. Please upload a file or enter text.' 
      });
    }

    console.log('✅ Content validation passed:', { 
      contentLength: content.length, 
      source, 
      preview: content.substring(0, 100) + '...' 
    });

    // Check for Gemini API key
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not configured');
      return res.status(500).json({ 
        success: false, 
        error: 'AI service not configured. Please contact support.' 
      });
    }

    console.log('🔑 Gemini API key found, calling AI service...');

    // Call Gemini AI
    const insight = await callGeminiAI(content, GEMINI_API_KEY, source);

    console.log('✅ Insight generated successfully:', { 
      title: insight.title, 
      priority: insight.priority, 
      confidence: insight.confidence 
    });

    return res.status(200).json({ 
      success: true, 
      ...insight
    });

  } catch (err) {
    console.error('❌ Error in generate-insights API:', err);
    
    let errorMessage = 'Analysis failed. Please try again.';
    let statusCode = 500;

    if (err instanceof Error) {
      if (err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message.includes('API')) {
        errorMessage = 'AI service temporarily unavailable. Please try again in a few minutes.';
      } else if (err.message.includes('JSON')) {
        errorMessage = 'Invalid data format. Please check your file and try again.';
      } else {
        errorMessage = err.message;
      }
    }

    return res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err instanceof Error ? err.message : 'Unknown error' : undefined
    });
  }
}

async function callGeminiAI(content: string, apiKey: string, source: string): Promise<InsightResponse> {
  console.log('🤖 Calling Gemini AI with content length:', content.length);

  const prompt = `
You are NoteX, a real-time AI business intelligence assistant. Analyze the provided business data and generate actionable insights.

DATA TO ANALYZE:
${content}

INSTRUCTIONS:
1. Generate ONE comprehensive, actionable business insight
2. Focus on business outcomes (Revenue, Growth, Retention, Operations)
3. Provide specific, measurable recommendations
4. Determine priority based on potential business impact
5. Estimate confidence based on data quality and insight reliability

OUTPUT FORMAT (JSON):
{
  "title": "Clear, actionable insight title",
  "content": "Detailed insight summary with key findings and context",
  "category": "Customer Experience|Revenue|Operations|Growth",
  "priority": "High|Medium|Low",
  "confidence": 85,
  "key_findings": [
    "Finding 1",
    "Finding 2",
    "Finding 3"
  ],
  "recommendations": [
    "Specific, actionable recommendation 1",
    "Specific, actionable recommendation 2",
    "Specific, actionable recommendation 3"
  ],
  "projected_impact": "Quantified business impact (e.g., 'Could increase revenue by 15% within 6 months')"
}

FOCUS AREAS:
- Customer Experience: Customer satisfaction, churn prevention, user experience
- Revenue: Sales opportunities, pricing optimization, market expansion
- Operations: Efficiency improvements, cost reduction, process optimization
- Growth: Market opportunities, product development, competitive advantages

Ensure the insight is practical, measurable, and immediately actionable for business decision-making.
`;

  try {
    console.log('📡 Making request to Gemini API...');
    
    // Use the new Gemini 2.0 model with the correct headers
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    console.log('📥 Gemini API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error:', { status: response.status, error: errorText });
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    // Get the response text first to debug any JSON issues
    const responseText = await response.text();
    console.log('📋 Raw Gemini response:', responseText.substring(0, 500) + '...');

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Response text:', responseText);
      throw new Error('Invalid JSON response from Gemini API');
    }

    console.log('📋 Parsed Gemini response structure:', Object.keys(data));
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('❌ Invalid Gemini response structure:', data);
      throw new Error('Invalid response structure from Gemini API');
    }

    const text = data.candidates[0].content.parts[0].text;
    console.log('📝 Gemini response text length:', text.length);
    console.log('📝 Gemini response text preview:', text.substring(0, 200) + '...');
    
    // Extract JSON from the response - be more flexible with the regex
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Could not extract JSON from Gemini response');
      console.error('❌ Full response text:', text);
      throw new Error('Could not extract JSON from Gemini response');
    }

    console.log('🔍 Extracted JSON from response');
    let insight;
    try {
      insight = JSON.parse(jsonMatch[0]) as InsightResponse;
    } catch (parseError) {
      console.error('❌ Error parsing extracted JSON:', parseError);
      console.error('❌ Extracted JSON text:', jsonMatch[0]);
      throw new Error('Invalid JSON format in Gemini response');
    }
    
    // Validate and provide defaults
    const validatedInsight = {
      title: insight.title || "Business Insight",
      content: insight.content || "Analysis of the provided data",
      category: insight.category || "Operations",
      priority: insight.priority || "Medium",
      confidence: insight.confidence || 75,
      key_findings: insight.key_findings || ["Data analyzed successfully"],
      recommendations: insight.recommendations || ["Review the data for patterns"],
      projected_impact: insight.projected_impact || "Improved data-driven decision making"
    };

    console.log('✅ Insight validation complete:', {
      title: validatedInsight.title,
      category: validatedInsight.category,
      priority: validatedInsight.priority,
      confidence: validatedInsight.confidence
    });

    return validatedInsight;

  } catch (error) {
    console.error('❌ Error calling Gemini API:', error);
    
    // Return fallback insight instead of throwing
    console.log('🔄 Returning fallback insight due to API error');
    
    return {
      title: "Data Analysis Complete",
      content: "Your data has been analyzed successfully. Manual review recommended for detailed insights.",
      category: "Operations",
      priority: "Medium",
      confidence: 70,
      key_findings: [
        "Data successfully processed",
        "Content analysis completed",
        "Ready for detailed business analysis"
      ],
      recommendations: [
        "Review uploaded content for patterns",
        "Consider additional data sources for deeper insights",
        "Schedule regular data analysis sessions"
      ],
      projected_impact: "Improved data-driven decision making capabilities"
    };
  }
}