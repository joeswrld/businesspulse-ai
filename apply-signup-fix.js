#!/usr/bin/env node

// Script to apply the signup database error fix
// This script can be run to test the fix or apply it to a database

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Signup Database Error Fix Application Script');
console.log('================================================');

// Read the SQL fix file
const sqlFixPath = path.join(__dirname, 'fix-signup-database-error-comprehensive.sql');
const sqlFix = fs.readFileSync(sqlFixPath, 'utf8');

console.log('📋 SQL Fix loaded successfully');
console.log('📏 Fix size:', sqlFix.length, 'characters');

// Create a test script
const testScript = `
// Test script to verify signup functionality
// Run this in your browser console after applying the database fix

async function testSignupFix() {
    console.log('🧪 Testing signup fix...');
    
    try {
        // Test with a unique email
        const testEmail = \`test-\${Date.now()}@example.com\`;
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
`;

// Write the test script
fs.writeFileSync(path.join(__dirname, 'test-signup-fix-browser.js'), testScript);

console.log('✅ Test script created: test-signup-fix-browser.js');
console.log('');
console.log('📋 To apply the fix:');
console.log('1. Open your Supabase dashboard');
console.log('2. Go to SQL Editor');
console.log('3. Copy and paste the contents of fix-signup-database-error-comprehensive.sql');
console.log('4. Run the SQL script');
console.log('');
console.log('🧪 To test the fix:');
console.log('1. Open your application in the browser');
console.log('2. Open the browser console');
console.log('3. Copy and paste the contents of test-signup-fix-browser.js');
console.log('4. Press Enter to run the test');
console.log('');
console.log('📁 Files created:');
console.log('- fix-signup-database-error-comprehensive.sql (database fix)');
console.log('- test-signup-fix-browser.js (browser test script)');
console.log('- apply-signup-fix.js (this script)');
console.log('');
console.log('🎯 Expected results after applying the fix:');
console.log('- Users can sign up without "Database error updating user"');
console.log('- Profiles are created automatically with proper data');
console.log('- Company names default to "Individual User" if empty');
console.log('- Trial periods are set correctly (8 days)');
console.log('- Email confirmation status is tracked properly');