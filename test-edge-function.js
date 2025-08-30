// Test script to verify Edge Function is working
// Run this in your browser console or as a Node.js script

const testEdgeFunction = async () => {
  // Replace these with your actual values
  const SUPABASE_URL = 'https://your-project.supabase.co';
  const JWT_TOKEN = 'your-jwt-token-here';
  const USER_ID = 'your-user-id-here';
  
  const testData = {
    name: "John Doe",
    age: 30,
    city: "New York",
    department: "Engineering",
    salary: 75000
  };

  try {
    console.log('🧪 Testing Edge Function...');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JWT_TOKEN}`,
      },
      body: JSON.stringify({
        data: testData,
        userId: USER_ID,
        fileType: 'application/json'
      }),
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS! Real Gemini AI Analysis:');
      console.log('📊 Summary:', result.analysis.summary);
      console.log('🎯 Key Themes:', result.analysis.key_themes);
      console.log('⚡ Suggested Actions:', result.analysis.suggested_actions);
      console.log('📈 Trends:', result.analysis.trends);
      console.log('📊 Performance Score:', result.analysis.performance.score);
      console.log('😊 Sentiment:', result.analysis.sentiment.overall);
      
      // Check if it's real analysis or mock
      if (result.analysis.summary.includes('comprehensive analysis of your') && 
          result.analysis.summary.includes('characters of data')) {
        console.log('⚠️  WARNING: This appears to be MOCK analysis!');
        console.log('🔧 Please check your Edge Function deployment and API keys.');
      } else {
        console.log('🎉 SUCCESS: This is REAL Gemini AI analysis!');
      }
    } else {
      const errorText = await response.text();
      console.log('❌ ERROR:', response.status, errorText);
      
      if (response.status === 401) {
        console.log('🔑 Issue: Authentication failed. Check your JWT token.');
      } else if (response.status === 404) {
        console.log('🔧 Issue: Function not found. Check if Edge Function is deployed.');
      } else if (response.status === 500) {
        console.log('🔧 Issue: Server error. Check Edge Function logs.');
      }
    }
  } catch (error) {
    console.log('❌ NETWORK ERROR:', error.message);
    console.log('🔧 Issue: Network error. Check your Supabase URL and internet connection.');
  }
};

// Instructions for use:
console.log(`
🔧 Edge Function Test Script
============================

To use this script:

1. Replace the values at the top:
   - SUPABASE_URL: Your Supabase project URL
   - JWT_TOKEN: Your user's JWT token (get from browser localStorage)
   - USER_ID: Your user's ID

2. Run the script:
   - In browser console: paste and run
   - In Node.js: node test-edge-function.js

3. Check the output:
   - ✅ SUCCESS = Function is working
   - ❌ ERROR = Function has issues
   - ⚠️  WARNING = Getting mock data instead of real AI

To get your JWT token:
1. Open browser dev tools (F12)
2. Go to Application/Storage tab
3. Look for localStorage
4. Find 'sb-[your-project-ref]-auth-token'
5. Copy the 'access_token' value
`);

// Uncomment the line below to run the test automatically
// testEdgeFunction();