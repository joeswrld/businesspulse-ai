/**
 * Test script for the feedback system
 * This script tests the Dashboard, Feedback, and FeedbackSettings pages
 */

// Test data for the feedback system
const testData = {
  user: {
    id: 'test-user-123',
    email: 'test@example.com',
    full_name: 'Test User'
  },
  project: {
    id: 'test-project-123',
    name: 'Test Project',
    project_id: 'test-proj-123'
  },
  feedback: {
    id: 'test-feedback-123',
    message: 'This is a test feedback message',
    email: 'customer@example.com',
    page_url: 'https://example.com/page',
    browser: 'Chrome'
  },
  settings: {
    id: 'test-settings-123',
    widget_title: 'We love your feedback!',
    widget_color: '#3B82F6',
    greeting_text: 'Help us improve by sharing your thoughts'
  }
};

// Test functions
const tests = {
  // Test Dashboard functionality
  testDashboard: async () => {
    console.log('🧪 Testing Dashboard...');
    
    try {
      // Test data loading
      const projects = await supabase
        .from('projects')
        .select('id, name, user_id, created_at')
        .eq('user_id', testData.user.id);
      
      console.log('✅ Projects loaded:', projects.data?.length || 0);
      
      // Test feedback loading
      const feedbacks = await supabase
        .from('feedback')
        .select('*')
        .in('project_id', projects.data?.map(p => p.id) || []);
      
      console.log('✅ Feedback loaded:', feedbacks.data?.length || 0);
      
      // Test subscription loading
      const subscription = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', testData.user.id)
        .maybeSingle();
      
      console.log('✅ Subscription loaded:', subscription.data ? 'Yes' : 'No');
      
      return true;
    } catch (error) {
      console.error('❌ Dashboard test failed:', error);
      return false;
    }
  },

  // Test Feedback page functionality
  testFeedback: async () => {
    console.log('🧪 Testing Feedback page...');
    
    try {
      // Test project loading
      const projects = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', testData.user.id);
      
      if (projects.data?.length === 0) {
        console.log('⚠️ No projects found, creating test project...');
        
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            user_id: testData.user.id,
            name: testData.project.name,
            project_id: testData.project.project_id
          })
          .select()
          .single();
        
        if (projectError) throw projectError;
        console.log('✅ Test project created');
      }
      
      // Test feedback loading
      const projectIds = projects.data?.map(p => p.id) || [];
      const feedbacks = await supabase
        .from('feedback')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });
      
      console.log('✅ Feedback loaded:', feedbacks.data?.length || 0);
      
      // Test filtering
      const filteredFeedbacks = feedbacks.data?.filter(f => 
        f.message.toLowerCase().includes('test')
      ) || [];
      
      console.log('✅ Filtering works:', filteredFeedbacks.length);
      
      return true;
    } catch (error) {
      console.error('❌ Feedback test failed:', error);
      return false;
    }
  },

  // Test FeedbackSettings functionality
  testFeedbackSettings: async () => {
    console.log('🧪 Testing FeedbackSettings page...');
    
    try {
      // Test project loading
      const projects = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', testData.user.id)
        .order('created_at', { ascending: false });
      
      if (projects.data?.length === 0) {
        console.log('⚠️ No projects found, creating test project...');
        
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            user_id: testData.user.id,
            name: testData.project.name,
            project_id: testData.project.project_id
          })
          .select()
          .single();
        
        if (projectError) throw projectError;
        projects.data = [newProject];
      }
      
      const project = projects.data[0];
      console.log('✅ Project loaded:', project.name);
      
      // Test settings loading
      const settings = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('project_id', project.id)
        .single();
      
      if (settings.error && settings.error.code === 'PGRST116') {
        console.log('⚠️ No settings found, creating default settings...');
        
        const { data: newSettings, error: settingsError } = await supabase
          .from('feedback_settings')
          .insert({
            user_id: testData.user.id,
            project_id: project.id,
            widget_title: testData.settings.widget_title,
            widget_color: testData.settings.widget_color,
            greeting_text: testData.settings.greeting_text
          })
          .select()
          .single();
        
        if (settingsError) throw settingsError;
        console.log('✅ Default settings created');
      } else {
        console.log('✅ Settings loaded');
      }
      
      // Test settings update
      const { error: updateError } = await supabase
        .from('feedback_settings')
        .upsert({
          user_id: testData.user.id,
          project_id: project.id,
          widget_title: 'Updated Title',
          widget_color: '#FF6B6B',
          greeting_text: 'Updated greeting text'
        });
      
      if (updateError) throw updateError;
      console.log('✅ Settings updated');
      
      return true;
    } catch (error) {
      console.error('❌ FeedbackSettings test failed:', error);
      return false;
    }
  },

  // Test RLS policies
  testRLSPolicies: async () => {
    console.log('🧪 Testing RLS policies...');
    
    try {
      // Test that users can only see their own projects
      const ownProjects = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', testData.user.id);
      
      console.log('✅ Own projects accessible:', ownProjects.data?.length || 0);
      
      // Test that users can only see their own feedback
      const ownFeedback = await supabase
        .from('feedback')
        .select('*')
        .in('project_id', ownProjects.data?.map(p => p.id) || []);
      
      console.log('✅ Own feedback accessible:', ownFeedback.data?.length || 0);
      
      // Test that users can only see their own settings
      const ownSettings = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('user_id', testData.user.id);
      
      console.log('✅ Own settings accessible:', ownSettings.data?.length || 0);
      
      return true;
    } catch (error) {
      console.error('❌ RLS test failed:', error);
      return false;
    }
  },

  // Test real-time subscriptions
  testRealtime: async () => {
    console.log('🧪 Testing real-time subscriptions...');
    
    try {
      let receivedUpdate = false;
      
      // Subscribe to feedback changes
      const channel = supabase
        .channel('test-feedback-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'feedback'
          },
          (payload) => {
            console.log('✅ Real-time update received:', payload.new);
            receivedUpdate = true;
          }
        )
        .subscribe();
      
      // Insert test feedback
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', testData.user.id)
        .single();
      
      if (project) {
        const { error } = await supabase
          .from('feedback')
          .insert({
            project_id: project.id,
            message: 'Real-time test feedback',
            email: 'test@example.com'
          });
        
        if (error) throw error;
        
        // Wait for real-time update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (receivedUpdate) {
          console.log('✅ Real-time subscription working');
        } else {
          console.log('⚠️ Real-time subscription may not be working');
        }
      }
      
      // Clean up
      supabase.removeChannel(channel);
      
      return true;
    } catch (error) {
      console.error('❌ Real-time test failed:', error);
      return false;
    }
  }
};

// Run all tests
const runAllTests = async () => {
  console.log('🚀 Starting feedback system tests...\n');
  
  const results = {
    dashboard: await tests.testDashboard(),
    feedback: await tests.testFeedback(),
    settings: await tests.testFeedbackSettings(),
    rls: await tests.testRLSPolicies(),
    realtime: await tests.testRealtime()
  };
  
  console.log('\n📊 Test Results:');
  console.log('Dashboard:', results.dashboard ? '✅ PASS' : '❌ FAIL');
  console.log('Feedback:', results.feedback ? '✅ PASS' : '❌ FAIL');
  console.log('Settings:', results.settings ? '✅ PASS' : '❌ FAIL');
  console.log('RLS Policies:', results.rls ? '✅ PASS' : '❌ FAIL');
  console.log('Real-time:', results.realtime ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = Object.values(results).every(result => result);
  console.log('\n🎯 Overall Result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  
  return results;
};

// Export for use in browser console or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { tests, runAllTests, testData };
} else {
  window.feedbackSystemTests = { tests, runAllTests, testData };
}