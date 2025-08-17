// Test Edge Function Script
// This script tests if the stream-insights Edge Function is working correctly

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEdgeFunction() {
  console.log('🧪 Testing stream-insights Edge Function...');
  
  const testContent = `
    Our company revenue increased by 15% this quarter compared to last year.
    Customer satisfaction scores are at 85%, up from 78% last quarter.
    We've seen a 20% increase in new customer acquisitions.
    However, customer churn rate has increased to 5% from 3% last quarter.
    Our marketing spend has increased by 25% but ROI has decreased by 10%.
  `;

  const testData = {
    content: testContent,
    source: "Test Data"
  };

  try {
    console.log('📡 Calling Edge Function...');
    console.log('📝 Test content length:', testContent.length, 'characters');
    
    const response = await supabase.functions.invoke('stream-insights', {
      body: testData
    });

    console.log('📥 Response received:');
    console.log('Status:', response.error ? 'Error' : 'Success');
    
    if (response.error) {
      console.error('❌ Edge Function Error:', response.error);
      return false;
    }

    if (!response.data) {
      console.error('❌ No data returned from Edge Function');
      return false;
    }

    console.log('✅ Edge Function Response:');
    console.log('Success:', response.data.success);
    console.log('Title:', response.data.title);
    console.log('Category:', response.data.category);
    console.log('Priority:', response.data.priority);
    console.log('Confidence:', response.data.confidence);
    console.log('Content length:', response.data.content?.length || 0);

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function testAuthentication() {
  console.log('\n🔐 Testing authentication...');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.log('⚠️  Not authenticated (this is normal for testing)');
      return true;
    }
    
    if (user) {
      console.log('✅ Authenticated as:', user.email);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n🗄️  Testing database connection...');
  
  try {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('⚠️  Database connection issue (may need RLS policies):', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Edge Function tests...\n');
  
  const authTest = await testAuthentication();
  const dbTest = await testDatabaseConnection();
  const functionTest = await testEdgeFunction();
  
  console.log('\n📊 Test Results:');
  console.log('Authentication:', authTest ? '✅ Pass' : '❌ Fail');
  console.log('Database:', dbTest ? '✅ Pass' : '❌ Fail');
  console.log('Edge Function:', functionTest ? '✅ Pass' : '❌ Fail');
  
  if (functionTest) {
    console.log('\n🎉 Edge Function is working correctly!');
    console.log('Your frontend should be able to connect successfully.');
  } else {
    console.log('\n❌ Edge Function test failed.');
    console.log('Please check:');
    console.log('1. Edge Function is deployed: supabase functions deploy stream-insights');
    console.log('2. Gemini API key is set: supabase secrets set GEMINI_API_KEY=your_key');
    console.log('3. Function logs: supabase functions logs stream-insights');
  }
}

// Run the tests
runAllTests().catch(console.error);