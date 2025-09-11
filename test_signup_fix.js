// Test script to verify signup process
// This can be run in the browser console to test the signup

async function testSignup() {
    console.log('🧪 Testing signup process...');
    
    try {
        // Import supabase client (assuming it's available globally)
        const { createClient } = supabase;
        
        // Test data
        const testEmail = `test-${Date.now()}@example.com`;
        const testPassword = 'testpassword123';
        const testData = {
            full_name: 'Test User',
            company_name: 'Test Company'
        };
        
        console.log('📧 Testing with email:', testEmail);
        
        // Attempt signup
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: testData
            }
        });
        
        if (error) {
            console.error('❌ Signup failed:', error);
            return { success: false, error };
        }
        
        console.log('✅ Signup successful:', data);
        return { success: true, data };
        
    } catch (err) {
        console.error('❌ Test failed:', err);
        return { success: false, error: err };
    }
}

// Run the test
testSignup().then(result => {
    console.log('🏁 Test result:', result);
});