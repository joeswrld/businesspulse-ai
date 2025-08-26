// Test script for project ID validation
// This script can be run in the browser console to test the validation functions

async function testProjectIdValidation() {
  console.log('🧪 Testing Project ID Validation Functions...');
  
  // Test 1: Check if validation function exists
  try {
    const { data, error } = await supabase.rpc('validate_project_id', {
      project_id_param: 'test123',
      current_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (error) {
      console.error('❌ Validation function error:', error);
      return;
    }
    
    console.log('✅ Validation function works:', data);
  } catch (err) {
    console.error('❌ Validation function not available:', err);
  }
  
  // Test 2: Check if availability function exists
  try {
    const { data, error } = await supabase.rpc('check_project_id_availability', {
      project_id_param: 'test123',
      current_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (error) {
      console.error('❌ Availability function error:', error);
      return;
    }
    
    console.log('✅ Availability function works:', data);
  } catch (err) {
    console.error('❌ Availability function not available:', err);
  }
  
  // Test 3: Check if get all project IDs function exists
  try {
    const { data, error } = await supabase.rpc('get_all_project_ids');
    
    if (error) {
      console.error('❌ Get all project IDs function error:', error);
      return;
    }
    
    console.log('✅ Get all project IDs function works:', data);
  } catch (err) {
    console.error('❌ Get all project IDs function not available:', err);
  }
}

// Test different project ID formats
async function testProjectIdFormats() {
  console.log('🧪 Testing Project ID Formats...');
  
  const testCases = [
    { id: 'valid123', expected: 'valid' },
    { id: 'valid-id', expected: 'valid' },
    { id: 'valid_id', expected: 'valid' },
    { id: 'ab', expected: 'too short' },
    { id: 'invalid@id', expected: 'invalid chars' },
    { id: 'invalid id', expected: 'invalid chars' },
    { id: '', expected: 'empty' }
  ];
  
  for (const testCase of testCases) {
    try {
      const { data, error } = await supabase.rpc('validate_project_id', {
        project_id_param: testCase.id,
        current_user_id: '00000000-0000-0000-0000-000000000000'
      });
      
      if (error) {
        console.log(`❌ ${testCase.id}: Error - ${error.message}`);
      } else {
        const result = data[0];
        console.log(`✅ ${testCase.id}: Valid=${result.is_valid}, Available=${result.is_available}, Message=${result.error_message}`);
      }
    } catch (err) {
      console.log(`❌ ${testCase.id}: Exception - ${err.message}`);
    }
  }
}

// Run tests
console.log('🚀 Starting Project ID Validation Tests...');
testProjectIdValidation().then(() => {
  console.log('📋 Testing different formats...');
  return testProjectIdFormats();
}).then(() => {
  console.log('✅ All tests completed!');
}).catch(err => {
  console.error('❌ Test failed:', err);
});