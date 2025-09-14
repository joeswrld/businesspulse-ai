// Test script to verify feedback settings fix
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xjbrqeqizpoqdjkiyqzt.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFeedbackSettings() {
  console.log('🧪 Testing feedback settings fix...');
  
  try {
    // Test with a dummy user ID
    const testUserId = '00000000-0000-0000-0000-000000000000';
    
    const { data, error } = await supabase
      .rpc('get_or_create_feedback_settings', { p_user_id: testUserId });
    
    if (error) {
      console.log('❌ Error:', error.message);
      console.log('Details:', error);
    } else {
      console.log('✅ Function working!');
      console.log('Data:', data);
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }
}

testFeedbackSettings();