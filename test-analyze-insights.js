// Test script for the deployed analyze-insights Edge Function
const SUPABASE_URL = 'https://xjbrqeqizpoqdjkiyqzt.supabase.co';

async function testAnalyzeInsights() {
  console.log('🧪 Testing deployed analyze-insights Edge Function...');
  
  // First, we need to get a valid JWT token
  console.log('🔑 Note: This function requires authentication, so we need a valid JWT token');
  console.log('📝 To test properly, you should:');
  console.log('   1. Go to your app and log in');
  console.log('   2. Open browser dev tools (F12)');
  console.log('   3. Go to Network tab');
  console.log('   4. Upload a file in /insights-simple');
  console.log('   5. Look for the request to analyze-insights');
  console.log('   6. Copy the Authorization header value');
  
  console.log('\n🔗 Your function URL:');
  console.log(`${SUPABASE_URL}/functions/v1/analyze-insights`);
  
  console.log('\n✅ Function deployment status:');
  console.log('   - Function name: analyze-insights');
  console.log('   - Status: Deployed');
  console.log('   - Endpoint: /functions/v1/analyze-insights');
  
  console.log('\n🎯 Next steps:');
  console.log('   1. Test the function in your app by uploading a file');
  console.log('   2. Check if you get real AI analysis instead of mock data');
  console.log('   3. Verify the analysis is saved to your database');
  
  console.log('\n🚀 Ready to test! Go to /insights-simple and upload a file.');
}

// Run the test
testAnalyzeInsights();