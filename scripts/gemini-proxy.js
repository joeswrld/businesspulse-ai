// Simple Gemini API Proxy Server
// Run this with: node scripts/gemini-proxy.js
// Set GEMINI_ENDPOINT to http://localhost:3001/gemini in your Supabase Edge Function

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Environment variables
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  console.error('❌ GOOGLE_API_KEY environment variable is required');
  console.log('Set it with: export GOOGLE_API_KEY=your_api_key_here');
  process.exit(1);
}

// Gemini API endpoint
app.post('/gemini', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    console.log('🤖 Processing prompt:', prompt.substring(0, 100) + '...');

    // Call Google Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    // Extract the generated text
    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('No text generated from Gemini API');
    }

    console.log('✅ Generated response:', generatedText.substring(0, 100) + '...');

    // Try to parse as JSON, fallback to structured response
    let parsed;
    try {
      parsed = JSON.parse(generatedText);
    } catch (parseError) {
      console.log('⚠️  Could not parse as JSON, creating structured response');
      
      // Create a structured response from the text
      const lines = generatedText.split('\n').filter(line => line.trim());
      parsed = {
        summary: lines[0] || 'Analysis completed successfully',
        bullets: lines.slice(1, 4).filter(line => line.trim()) || ['Key insights extracted'],
        recommendations: ['Review the data for additional patterns', 'Consider implementing suggested improvements'],
        business_impact: 'Medium - provides actionable insights for business decisions'
      };
    }

    res.json(parsed);

  } catch (error) {
    console.error('❌ Error processing request:', error);
    res.status(500).json({ 
      error: error.message,
      summary: 'Analysis could not be completed',
      bullets: ['Please try again later'],
      recommendations: ['Check your data format'],
      business_impact: 'Low - analysis failed'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Gemini Proxy Server'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Gemini Proxy Server running on http://localhost:${PORT}`);
  console.log(`📝 POST /gemini - Process AI analysis requests`);
  console.log(`💚 GET /health - Health check endpoint`);
  console.log(`🔑 Using API key: ${GOOGLE_API_KEY.substring(0, 10)}...`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down Gemini Proxy Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down Gemini Proxy Server...');
  process.exit(0);
});