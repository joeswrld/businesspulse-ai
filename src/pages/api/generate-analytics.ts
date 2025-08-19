import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, insights_data } = req.body;

    if (!user_id || !insights_data || !Array.isArray(insights_data)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    if (insights_data.length === 0) {
      return res.status(400).json({ error: 'No insights data available for analysis' });
    }

    // Prepare the data for Gemini analysis
    const insightsSummary = insights_data.map(item => ({
      summary: item.summary,
      sentiment: item.sentiment,
      themes: Array.isArray(item.key_themes) ? item.key_themes.map(theme => 
        typeof theme === 'string' ? theme : theme.theme
      ) : [],
      actions: Array.isArray(item.suggested_actions) ? item.suggested_actions.map(action => 
        typeof action === 'string' ? action : action.action
      ) : [],
      date: item.created_at
    }));

    // Calculate basic metrics
    const totalInsights = insights_data.length;
    const positiveCount = insights_data.filter(item => item.sentiment === 'positive').length;
    const negativeCount = insights_data.filter(item => item.sentiment === 'negative').length;
    const neutralCount = insights_data.filter(item => item.sentiment === 'neutral').length;

    const positivePercentage = Math.round((positiveCount / totalInsights) * 100);
    const negativePercentage = Math.round((negativeCount / totalInsights) * 100);
    const neutralPercentage = Math.round((neutralCount / totalInsights) * 100);

    // Build the prompt for Gemini
    const prompt = `
You are a senior business analyst specializing in AI insights analysis. Analyze the following AI-generated insights data and provide comprehensive business intelligence.

AI Insights Data:
${JSON.stringify(insightsSummary, null, 2)}

Basic Metrics:
- Total Insights: ${totalInsights}
- Positive: ${positiveCount} (${positivePercentage}%)
- Negative: ${negativeCount} (${negativePercentage}%)
- Neutral: ${neutralCount} (${neutralPercentage}%)

Please analyze this data and provide insights in the following JSON structure:

{
  "executive_summary": "A 2-3 sentence executive summary of the key findings from the insights analysis",
  "key_insights": [
    "3-5 key insights derived from the AI insights data",
    "Focus on actionable business intelligence",
    "Highlight patterns and trends"
  ],
  "trends": [
    "2-3 emerging trends identified from the insights",
    "Include both positive and concerning trends",
    "Be specific and data-driven"
  ],
  "performance_metrics": {
    "positive": ${positivePercentage},
    "negative": ${negativePercentage},
    "neutral": ${neutralPercentage}
  },
  "recommended_actions": [
    "3-4 specific, actionable recommendations",
    "Prioritize by impact and feasibility",
    "Include both quick wins and strategic initiatives"
  ]
}

Requirements:
- Base all insights on the actual AI insights data provided
- Be specific and actionable
- Focus on business value and strategic insights
- Keep each insight/trend/action concise but meaningful
- Ensure the JSON structure is valid and complete
- Do not invent or assume data not present in the insights

Return only the JSON response, no additional text or formatting.
`;

    // Generate analysis using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to generate valid JSON response from Gemini');
    }

    const analytics = JSON.parse(jsonMatch[0]);

    // Validate the response structure
    const requiredFields = ['executive_summary', 'key_insights', 'trends', 'performance_metrics', 'recommended_actions'];
    const missingFields = requiredFields.filter(field => !analytics[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate performance metrics
    if (!analytics.performance_metrics.positive && 
        !analytics.performance_metrics.negative && 
        !analytics.performance_metrics.neutral) {
      throw new Error('Invalid performance metrics structure');
    }

    return res.status(200).json(analytics);

  } catch (error) {
    console.error('Error generating analytics:', error);
    
    if (error instanceof Error) {
      return res.status(500).json({ 
        error: 'Failed to generate analytics',
        details: error.message 
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to generate analytics',
      details: 'Unknown error occurred'
    });
  }
}