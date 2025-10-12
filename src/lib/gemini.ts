import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY

if (!apiKey) {
  throw new Error('Missing Gemini API key')
}

const genAI = new GoogleGenerativeAI(apiKey)
const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

export interface FeedbackAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative'
  summary: string
  suggested_reply: string
  tags: string[]
}

export const analyzeFeedback = async (content: string): Promise<FeedbackAnalysis> => {
  try {
    const prompt = `Analyze this customer feedback and provide a JSON response:

"${content}"

Please analyze the feedback and return a JSON object with the following structure:
{
  "sentiment": "positive|neutral|negative",
  "summary": "A brief 1-2 sentence summary of the feedback",
  "suggested_reply": "A professional response suggestion for the customer",
  "tags": ["tag1", "tag2", "tag3"] // Extract 2-4 relevant tags
}

Focus on:
- Sentiment analysis (positive for praise, negative for complaints, neutral for questions/suggestions)
- Clear, actionable summary
- Professional, empathetic response
- Relevant tags for categorization

Return only the JSON object, no additional text.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Clean up the response to extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    
    const analysis = JSON.parse(jsonMatch[0])
    
    // Validate the response structure
    if (!analysis.sentiment || !analysis.summary || !analysis.suggested_reply || !Array.isArray(analysis.tags)) {
      throw new Error('Invalid analysis structure')
    }
    
    return {
      sentiment: analysis.sentiment,
      summary: analysis.summary,
      suggested_reply: analysis.suggested_reply,
      tags: analysis.tags
    }
  } catch (error) {
    console.error('Error analyzing feedback:', error)
    
    // Return fallback analysis
    return {
      sentiment: 'neutral',
      summary: 'Feedback received and will be reviewed',
      suggested_reply: 'Thank you for your feedback. We will review it and get back to you soon.',
      tags: ['general']
    }
  }
}