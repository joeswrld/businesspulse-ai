
// Test script to verify signup functionality
// Run this in your browser console after applying the database fix

async function testSignupFix() {
    console.log('🧪 Testing signup fix...');
    
    try {
        // Test with a unique email
        const testEmail = `test-${Date.now()}@example.com`;
        const testPassword = 'testpassword123';
        
        console.log('📧 Testing with email:', testEmail);
        
        // Attempt signup
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    full_name: 'Test User',
                    company_name: 'Test Company'
                }
            }
        });
        
        if (error) {
            console.error('❌ Signup failed:', error);
            return { success: false, error };
        }
        
        console.log('✅ Signup successful!');
        console.log('User ID:', data.user?.id);
        console.log('Email:', data.user?.email);
        
        // Check if profile was created
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', data.user?.id)
            .single();
            
        if (profileError) {
            console.warn('⚠️  Profile not found:', profileError);
        } else {
            console.log('✅ Profile created successfully:', profile);
        }
        
        return { success: true, data, profile };
        
    } catch (err) {
        console.error('❌ Test failed:', err);
        return { success: false, error: err };
    }
}

// Run the test
testSignupFix().then(result => {
    console.log('🏁 Test result:', result);
    if (result.success) {
        console.log('🎉 Signup fix is working correctly!');
    } else {
        console.log('❌ Signup fix needs attention');
    }
});
