// Test Email Confirmation Fix
// This script tests the email confirmation flow

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjbrqeqizpoqdjkiyqzt.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmailConfirmation() {
  console.log('🧪 Testing Email Confirmation Fix...');
  
  try {
    // Test 1: Check if functions exist
    console.log('1. Testing check_user_access function...');
    const { data: accessData, error: accessError } = await supabase.rpc('check_user_access', {
      user_uuid: '00000000-0000-0000-0000-000000000000'
    });
    
    if (accessError) {
      console.error('❌ check_user_access failed:', accessError);
    } else {
      console.log('✅ check_user_access works:', accessData);
    }
    
    // Test 2: Check current session
    console.log('2. Testing current session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session check failed:', sessionError);
    } else {
      console.log('✅ Session check works:', session?.user?.email || 'No user');
    }
    
    console.log('🎉 Email confirmation fix test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEmailConfirmation();