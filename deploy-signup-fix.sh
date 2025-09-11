#!/bin/bash

# ============================================================================
# DEPLOY SIGNUP DATABASE ERROR FIX
# ============================================================================

echo "🔧 Deploying signup database error fix..."

# Check if we're in the right directory
if [ ! -f "fix-signup-database-error.sql" ]; then
    echo "❌ Error: fix-signup-database-error.sql not found in current directory"
    echo "Please run this script from the workspace root directory"
    exit 1
fi

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found. You'll need to apply the fix manually."
    echo ""
    echo "To apply the fix manually:"
    echo "1. Open your Supabase dashboard"
    echo "2. Go to SQL Editor"
    echo "3. Copy and paste the contents of fix-signup-database-error.sql"
    echo "4. Run the SQL script"
    echo ""
    echo "Alternatively, install Supabase CLI:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're logged in to Supabase
if ! supabase status &> /dev/null; then
    echo "⚠️  Not connected to Supabase. Please run:"
    echo "supabase login"
    echo "supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

echo "📋 Applying database fix..."

# Apply the fix
if supabase db push --include-all; then
    echo "✅ Database fix applied successfully!"
else
    echo "❌ Failed to apply database fix via Supabase CLI"
    echo ""
    echo "Please apply the fix manually:"
    echo "1. Open your Supabase dashboard"
    echo "2. Go to SQL Editor"
    echo "3. Copy and paste the contents of fix-signup-database-error.sql"
    echo "4. Run the SQL script"
    exit 1
fi

echo ""
echo "🧪 Testing the fix..."

# Create a simple test
cat > test-signup.js << 'EOF'
// Simple test to verify the signup fix
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseKey === 'YOUR_SUPABASE_ANON_KEY') {
    console.log('⚠️  Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
    console.log('Or update the script with your actual Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
    const testEmail = `test${Date.now()}@example.com`;
    
    console.log(`🧪 Testing signup with email: ${testEmail}`);
    
    try {
        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: 'testpassword123',
            options: {
                data: {
                    full_name: 'Test User',
                    company_name: 'Test Company'
                }
            }
        });
        
        if (error) {
            console.error('❌ Signup test failed:', error.message);
            return false;
        }
        
        console.log('✅ Signup test successful!');
        console.log('User created:', data.user?.email);
        return true;
        
    } catch (err) {
        console.error('❌ Signup test error:', err.message);
        return false;
    }
}

testSignup().then(success => {
    process.exit(success ? 0 : 1);
});
EOF

echo "📝 Test script created: test-signup.js"
echo ""
echo "To test the fix:"
echo "1. Set your environment variables:"
echo "   export VITE_SUPABASE_URL='your-supabase-url'"
echo "   export VITE_SUPABASE_ANON_KEY='your-supabase-anon-key'"
echo ""
echo "2. Run the test:"
echo "   node test-signup.js"
echo ""
echo "Or open test-signup-fix.html in your browser for a web-based test."

echo ""
echo "🎉 Signup database error fix deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test the signup functionality in your application"
echo "2. Verify that users can create accounts without the 'Database error updating user' error"
echo "3. Check that profiles are created correctly in the database"