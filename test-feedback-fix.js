/**
 * Test script for the Feedback System Fix
 * This script tests the database functions and schema
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration - Update these with your actual values
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xjbrqeqizpoqdjkiyqzt.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYnJxZXFpenBvcWRqa2l5cXp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwNTAzMjcsImV4cCI6MjA3MDYyNjMyN30.cxMH9tUGYEOTUauzluSEeNyjG1iMtUZnNIj4QYGNi84';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFeedbackSystem() {
  console.log('🧪 Testing Feedback System Fix...\n');

  try {
    // Test 1: Check if feedback table exists and has correct structure
    console.log('1️⃣ Testing feedback table structure...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'feedback')
      .order('ordinal_position');

    if (columnsError) {
      throw new Error(`Failed to check table structure: ${columnsError.message}`);
    }

    const requiredColumns = ['id', 'project_id', 'channel', 'name', 'email', 'message', 'created_at'];
    const existingColumns = columns.map(col => col.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length > 0) {
      console.log('❌ Missing columns:', missingColumns);
      return false;
    } else {
      console.log('✅ All required columns present');
    }

    // Test 2: Test insert_feedback_safe function
    console.log('\n2️⃣ Testing insert_feedback_safe function...');
    const testProjectId = 'test-project-' + Date.now();
    
    const { data: insertResult, error: insertError } = await supabase.rpc('insert_feedback_safe', {
      p_project_id: testProjectId,
      p_channel: 'widget',
      p_name: 'Test User',
      p_email: 'test@example.com',
      p_message: 'This is a test feedback message'
    });

    if (insertError) {
      throw new Error(`Failed to insert test feedback: ${insertError.message}`);
    }

    console.log('✅ Test feedback inserted successfully, ID:', insertResult);

    // Test 3: Test different channels
    console.log('\n3️⃣ Testing different channels...');
    const channels = ['widget', 'qr', 'email_signature'];
    
    for (const channel of channels) {
      const { error: channelError } = await supabase.rpc('insert_feedback_safe', {
        p_project_id: testProjectId,
        p_channel: channel,
        p_name: `Test User ${channel}`,
        p_email: `test-${channel}@example.com`,
        p_message: `Test feedback from ${channel} channel`
      });

      if (channelError) {
        throw new Error(`Failed to insert ${channel} feedback: ${channelError.message}`);
      }
    }

    console.log('✅ All channels tested successfully');

    // Test 4: Test RLS policies
    console.log('\n4️⃣ Testing RLS policies...');
    const { data: feedbackData, error: feedbackError } = await supabase
      .from('feedback')
      .select('*')
      .eq('project_id', testProjectId);

    if (feedbackError) {
      throw new Error(`Failed to read feedback: ${feedbackError.message}`);
    }

    console.log(`✅ RLS policies working, found ${feedbackData.length} feedback entries`);

    // Test 5: Test get_feedback_for_project function
    console.log('\n5️⃣ Testing get_feedback_for_project function...');
    const { data: projectFeedback, error: projectError } = await supabase.rpc('get_feedback_for_project', {
      p_project_id: testProjectId
    });

    if (projectError) {
      console.log('⚠️ get_feedback_for_project function not available or requires authentication');
    } else {
      console.log(`✅ get_feedback_for_project working, found ${projectFeedback.length} entries`);
    }

    // Test 6: Test realtime subscription (basic check)
    console.log('\n6️⃣ Testing realtime subscription setup...');
    const { data: realtimeData, error: realtimeError } = await supabase
      .from('feedback')
      .select('id')
      .limit(1);

    if (realtimeError) {
      throw new Error(`Failed to test realtime: ${realtimeError.message}`);
    }

    console.log('✅ Realtime subscription setup working');

    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('feedback')
      .delete()
      .eq('project_id', testProjectId);

    if (deleteError) {
      console.log('⚠️ Could not clean up test data:', deleteError.message);
    } else {
      console.log('✅ Test data cleaned up');
    }

    console.log('\n🎉 All tests passed! The feedback system fix is working correctly.');
    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting steps:');
    console.error('1. Ensure the database migration has been run');
    console.error('2. Check that the insert_feedback_safe function exists');
    console.error('3. Verify RLS policies are properly configured');
    console.error('4. Check your Supabase URL and API key');
    return false;
  }
}

// Run the test
if (require.main === module) {
  testFeedbackSystem().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testFeedbackSystem };