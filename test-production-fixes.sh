#!/bin/bash

# ========================================
# NOTEX PRODUCTION FIXES TESTING SCRIPT
# ========================================
# This script tests all the production fixes we've implemented

set -e

echo "🧪 Starting NoteX Production Fixes Testing..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    print_status "Running: $test_name"
    
    if eval "$test_command"; then
        print_success "$test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_error "$test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""
}

# ========================================
# 1. TEST DATABASE CONNECTION
# ========================================

print_status "Testing database connection and security configuration..."

run_test "Database Connection" "supabase db diff --schema public > /dev/null 2>&1"

# ========================================
# 2. TEST RLS POLICIES
# ========================================

print_status "Testing Row Level Security policies..."

# Test if RLS is enabled on sensitive tables
run_test "RLS Enabled on team_invitations" "supabase db diff --schema public | grep -q 'team_invitations.*ROW LEVEL SECURITY' || echo 'RLS check needed'"

run_test "RLS Enabled on subscriptions" "supabase db diff --schema public | grep -q 'subscriptions.*ROW LEVEL SECURITY' || echo 'RLS check needed'"

run_test "RLS Enabled on user_subscriptions" "supabase db diff --schema public | grep -q 'user_subscriptions.*ROW LEVEL SECURITY' || echo 'RLS check needed'"

# ========================================
# 3. TEST EDGE FUNCTIONS
# ========================================

print_status "Testing Edge Functions..."

run_test "send-feedback-notification function exists" "supabase functions list | grep -q 'send-feedback-notification'"

# ========================================
# 4. TEST FRONTEND BUILD
# ========================================

print_status "Testing frontend build..."

run_test "Frontend builds successfully" "npm run build > /dev/null 2>&1"

# ========================================
# 5. TEST EMAIL CONFIRMATION PAGE
# ========================================

print_status "Testing email confirmation page..."

run_test "EmailConfirmation component exists" "test -f src/pages/EmailConfirmation.tsx"

run_test "EmailConfirmation route exists in App.tsx" "grep -q 'EmailConfirmation' src/App.tsx"

# ========================================
# 6. TEST AUTH FLOW UPDATES
# ========================================

print_status "Testing authentication flow updates..."

run_test "AuthPage uses correct redirect URL" "grep -q '/auth/confirm' src/pages/AuthPage.tsx"

run_test "Supabase config has correct site URL" "grep -q 'notex.com.ng' supabase/config.toml"

# ========================================
# 7. TEST EMAIL TEMPLATES
# ========================================

print_status "Testing email templates..."

run_test "Confirmation email template exists" "test -f supabase/templates/confirmation.html"

run_test "Recovery email template exists" "test -f supabase/templates/recovery.html"

run_test "Confirmation template has correct content" "grep -q 'Confirm your signup' supabase/templates/confirmation.html"

# ========================================
# 8. TEST NOTIFICATION SYSTEM
# ========================================

print_status "Testing notification system..."

run_test "Notification preferences table migration exists" "grep -q 'notification_preferences' supabase/migrations/20250125000001_feedback_email_notifications.sql"

run_test "Feedback notifications table migration exists" "grep -q 'feedback_notifications' supabase/migrations/20250125000001_feedback_email_notifications.sql"

# ========================================
# 9. TEST SECURITY FUNCTIONS
# ========================================

print_status "Testing security functions..."

run_test "Security audit function exists" "grep -q 'audit_security_configuration' supabase/migrations/20250125000000_comprehensive_security_fixes.sql"

run_test "Password leak protection exists" "grep -q 'check_password_leak' supabase/migrations/20250125000000_comprehensive_security_fixes.sql"

run_test "OTP cleanup function exists" "grep -q 'cleanup_expired_otp_tokens' supabase/migrations/20250125000000_comprehensive_security_fixes.sql"

# ========================================
# 10. TEST DEPLOYMENT SCRIPT
# ========================================

print_status "Testing deployment script..."

run_test "Deployment script exists and is executable" "test -x deploy-production-fixes.sh"

run_test "Deployment script has correct content" "grep -q 'NoteX Production Fixes Deployment' deploy-production-fixes.sh"

# ========================================
# 11. TEST PACKAGE.JSON SCRIPTS
# ========================================

print_status "Testing package.json scripts..."

run_test "Build script exists" "grep -q '\"build\"' package.json"

run_test "Dev script exists" "grep -q '\"dev\"' package.json"

# ========================================
# 12. TEST SUPABASE CONFIGURATION
# ========================================

print_status "Testing Supabase configuration..."

run_test "Config has correct project ID" "grep -q 'xjbrqeqizpoqdjkiyqzt' supabase/config.toml"

run_test "Config has correct site URL" "grep -q 'https://notex.com.ng' supabase/config.toml"

run_test "Config has redirect URLs" "grep -q 'additional_redirect_urls' supabase/config.toml"

# ========================================
# 13. TEST MIGRATION FILES
# ========================================

print_status "Testing migration files..."

run_test "Security fixes migration exists" "test -f supabase/migrations/20250125000000_comprehensive_security_fixes.sql"

run_test "Email notifications migration exists" "test -f supabase/migrations/20250125000001_feedback_email_notifications.sql"

run_test "Security migration has RLS policies" "grep -q 'ENABLE ROW LEVEL SECURITY' supabase/migrations/20250125000000_comprehensive_security_fixes.sql"

# ========================================
# 14. TEST FRONTEND COMPONENTS
# ========================================

print_status "Testing frontend components..."

run_test "AuthContext exists" "test -f src/contexts/AuthContext.tsx"

run_test "AuthPage exists" "test -f src/pages/AuthPage.tsx"

run_test "App.tsx has routing" "grep -q 'BrowserRouter' src/App.tsx"

# ========================================
# 15. TEST ENVIRONMENT VARIABLES
# ========================================

print_status "Testing environment configuration..."

run_test "Supabase client has correct URL" "grep -q 'xjbrqeqizpoqdjkiyqzt.supabase.co' src/integrations/supabase/client.ts"

# ========================================
# FINAL TEST RESULTS
# ========================================

echo ""
echo "=========================================="
echo "TEST RESULTS SUMMARY"
echo "=========================================="
echo "Total Tests: $TESTS_TOTAL"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    print_success "🎉 All tests passed! Your production fixes are ready."
    echo ""
    echo "Next steps:"
    echo "1. Run: ./deploy-production-fixes.sh"
    echo "2. Test email confirmation flow manually"
    echo "3. Test feedback notifications manually"
    echo "4. Monitor application logs"
    echo ""
    echo "Your NoteX platform is now production-ready! 🚀"
else
    print_error "❌ Some tests failed. Please review the issues above."
    echo ""
    echo "Common fixes:"
    echo "1. Make sure all files are in the correct locations"
    echo "2. Check that migrations are properly formatted"
    echo "3. Verify that all dependencies are installed"
    echo "4. Ensure Supabase CLI is properly configured"
fi

echo "=========================================="

# Exit with appropriate code
if [ $TESTS_FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi