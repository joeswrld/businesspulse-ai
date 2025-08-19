import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, feedback_data } = req.body;

    if (!user_id || !feedback_data || !Array.isArray(feedback_data)) {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    if (feedback_data.length === 0) {
      return res.status(400).json({ error: 'No feedback data available for analysis' });
    }

    // Prepare the data for Gemini analysis
    const feedbackSummary = feedback_data.map(item => ({
      text: item.feedback_text,
      sentiment: item.sentiment,
      category: item.category,
      priority: item.priority,
      date: item.created_at
    }));

    // Calculate basic metrics
    const totalFeedback = feedback_data.length;
    const positiveCount = feedback_data.filter(item => item.sentiment === 'positive').length;
    const negativeCount = feedback_data.filter(item => item.sentiment === 'negative').length;
    const neutralCount = feedback_data.filter(item => item.sentiment === 'neutral').length;

    const positivePercentage = Math.round((positiveCount / totalFeedback) * 100);
    const negativePercentage = Math.round((negativeCount / totalFeedback) * 100);
    const neutralPercentage = Math.round((neutralCount / totalFeedback) * 100);

    // Build the prompt for Gemini
    const prompt = `
You are a senior business analyst specializing in customer feedback analysis. Analyze the following customer feedback data and provide comprehensive business insights.

Customer Feedback Data:
${JSON.stringify(feedbackSummary, null, 2)}

Basic Metrics:
- Total Feedback: ${totalFeedback}
- Positive: ${positiveCount} (${positivePercentage}%)
- Negative: ${negativeCount} (${negativePercentage}%)
- Neutral: ${neutralCount} (${neutralPercentage}%)

Please analyze this data and provide insights in the following JSON structure:

{
  "executive_summary": "A 2-3 sentence executive summary of the key findings from the feedback analysis",
  "key_insights": [
    "3-5 key insights derived from the feedback data",
    "Focus on actionable business intelligence",
    "Highlight patterns and trends"
  ],
  "trends": [
    "2-3 emerging trends identified from the feedback",
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
- Base all insights on the actual feedback data provided
- Be specific and actionable
- Focus on business value and customer experience
- Keep each insight/trend/action concise but meaningful
- Ensure the JSON structure is valid and complete
- Do not invent or assume data not present in the feedback

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