// Test API Route Script
// This script tests if the generate-insights API route is working

const testContent = `
Our company revenue increased by 15% this quarter compared to last year.
Customer satisfaction scores are at 85%, up from 78% last quarter.
We've seen a 20% increase in new customer acquisitions.
However, customer churn rate has increased to 5% from 3% last quarter.
Our marketing spend has increased by 25% but ROI has decreased by 10%.
`;

async function testAPI() {
  console.log('🧪 Testing generate-insights API route...');
  console.log('📝 Test content length:', testContent.length, 'characters');
  
  try {
    const response = await fetch('http://localhost:3000/api/generate-insights', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: testContent,
        source: 'Test Data'
      })
    });

    console.log('📥 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return false;
    }

    // Get response text first to debug JSON issues
    const responseText = await response.text();
    console.log('📋 Raw response preview:', responseText.substring(0, 200) + '...');

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Response text:', responseText);
      return false;
    }
    
    if (result.success) {
      console.log('✅ API Response:');
      console.log('Title:', result.title);
      console.log('Category:', result.category);
      console.log('Priority:', result.priority);
      console.log('Confidence:', result.confidence);
      console.log('Content length:', result.content?.length || 0);
      return true;
    } else {
      console.error('❌ Analysis failed:', result.error);
      return false;
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('💡 Make sure your development server is running: npm run dev');
    return false;
  }
}

// Run the test
testAPI().then(success => {
  if (success) {
    console.log('\n🎉 API route is working correctly!');
    console.log('Your frontend should be able to generate insights successfully.');
  } else {
    console.log('\n❌ API route test failed.');
    console.log('Please check:');
    console.log('1. Development server is running: npm run dev');
    console.log('2. GEMINI_API_KEY is set in .env.local');
    console.log('3. API route file exists: src/pages/api/generate-insights.ts');
    console.log('4. Check the console output above for specific error details');
  }
});