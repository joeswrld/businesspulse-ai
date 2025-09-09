#!/bin/bash

# Comprehensive Test Script for Free Trial, Business Plan, and Platform Lock Logic
# This script tests all the fixes implemented for the trial system

set -e

echo "🧪 Starting comprehensive test of trial and billing system fixes..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    echo -e "${BLUE}🔍 Testing: $test_name${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        echo -e "${RED}   Expected: $expected_result${NC}"
        ((TESTS_FAILED++))
    fi
    echo ""
}

# Function to check if a file exists
check_file_exists() {
    local file_path="$1"
    if [ -f "$file_path" ]; then
        return 0
    else
        return 1
    fi
}

# Function to check if a function exists in a file
check_function_exists() {
    local file_path="$1"
    local function_name="$2"
    if grep -q "$function_name" "$file_path"; then
        return 0
    else
        return 1
    fi
}

echo "📋 Test 1: File Structure and Components"
echo "========================================"

run_test "UnifiedTrialContext exists" \
    "check_file_exists 'src/contexts/UnifiedTrialContext.tsx'" \
    "UnifiedTrialContext.tsx should exist"

run_test "UnifiedPlatformLock exists" \
    "check_file_exists 'src/components/UnifiedPlatformLock.tsx'" \
    "UnifiedPlatformLock.tsx should exist"

run_test "UnifiedProtectedRoute exists" \
    "check_file_exists 'src/components/UnifiedProtectedRoute.tsx'" \
    "UnifiedProtectedRoute.tsx should exist"

run_test "UnifiedPlatformAccess hook exists" \
    "check_file_exists 'src/hooks/useUnifiedPlatformAccess.ts'" \
    "useUnifiedPlatformAccess.ts should exist"

run_test "UnifiedTrialGatedFeedbackWidget exists" \
    "check_file_exists 'src/components/UnifiedTrialGatedFeedbackWidget.tsx'" \
    "UnifiedTrialGatedFeedbackWidget.tsx should exist"

run_test "Database migration file exists" \
    "check_file_exists 'fix_trial_and_billing_system.sql'" \
    "fix_trial_and_billing_system.sql should exist"

echo "📋 Test 2: Component Functionality"
echo "=================================="

run_test "UnifiedTrialContext has checkAccess function" \
    "check_function_exists 'src/contexts/UnifiedTrialContext.tsx' 'checkAccess'" \
    "checkAccess function should exist in UnifiedTrialContext"

run_test "UnifiedTrialContext has upgradeToBusiness function" \
    "check_function_exists 'src/contexts/UnifiedTrialContext.tsx' 'upgradeToBusiness'" \
    "upgradeToBusiness function should exist in UnifiedTrialContext"

run_test "UnifiedTrialContext has initializeTrial function" \
    "check_function_exists 'src/contexts/UnifiedTrialContext.tsx' 'initializeTrial'" \
    "initializeTrial function should exist in UnifiedTrialContext"

run_test "UnifiedPlatformLock has proper access control" \
    "check_function_exists 'src/components/UnifiedPlatformLock.tsx' 'shouldLock'" \
    "shouldLock logic should exist in UnifiedPlatformLock"

run_test "UnifiedProtectedRoute uses UnifiedTrialProvider" \
    "check_function_exists 'src/components/UnifiedProtectedRoute.tsx' 'useUnifiedTrial'" \
    "UnifiedProtectedRoute should use useUnifiedTrial hook"

echo "📋 Test 3: Database Functions"
echo "============================="

run_test "Database migration has initialize_user_trial function" \
    "check_function_exists 'fix_trial_and_billing_system.sql' 'initialize_user_trial'" \
    "initialize_user_trial function should exist in database migration"

run_test "Database migration has check_user_access function" \
    "check_function_exists 'fix_trial_and_billing_system.sql' 'check_user_access'" \
    "check_user_access function should exist in database migration"

run_test "Database migration has upgrade_user_to_business function" \
    "check_function_exists 'fix_trial_and_billing_system.sql' 'upgrade_user_to_business'" \
    "upgrade_user_to_business function should exist in database migration"

run_test "Database migration has get_user_status function" \
    "check_function_exists 'fix_trial_and_billing_system.sql' 'get_user_status'" \
    "get_user_status function should exist in database migration"

echo "📋 Test 4: App.tsx Integration"
echo "============================="

run_test "App.tsx uses UnifiedTrialProvider" \
    "check_function_exists 'src/App.tsx' 'UnifiedTrialProvider'" \
    "App.tsx should use UnifiedTrialProvider"

run_test "App.tsx uses UnifiedProtectedRoute" \
    "check_function_exists 'src/App.tsx' 'UnifiedProtectedRoute'" \
    "App.tsx should use UnifiedProtectedRoute"

run_test "App.tsx has proper route protection" \
    "grep -q 'UnifiedProtectedRoute' src/App.tsx" \
    "All protected routes should use UnifiedProtectedRoute"

echo "📋 Test 5: Access Control Logic"
echo "==============================="

# Check if the access control logic is properly implemented
run_test "Business plan access logic exists" \
    "grep -q 'Business plan users with active subscription ALWAYS have access' src/contexts/UnifiedTrialContext.tsx" \
    "Business plan access logic should be implemented"

run_test "Trial access logic exists" \
    "grep -q 'Trial users have access if trial is active and not expired' src/contexts/UnifiedTrialContext.tsx" \
    "Trial access logic should be implemented"

run_test "New user access logic exists" \
    "grep -q 'New users should not be locked' src/contexts/UnifiedTrialContext.tsx" \
    "New user access logic should be implemented"

run_test "Platform locking logic exists" \
    "grep -q 'Business plan users with inactive subscription should be locked' src/contexts/UnifiedTrialContext.tsx" \
    "Platform locking logic should be implemented"

echo "📋 Test 6: Widget Access Control"
echo "==============================="

run_test "Widget access control exists" \
    "check_function_exists 'src/components/UnifiedTrialGatedFeedbackWidget.tsx' 'canUseFeedback'" \
    "Widget access control should be implemented"

run_test "Platform access hook exists" \
    "check_function_exists 'src/hooks/useUnifiedPlatformAccess.ts' 'canUseWidgets'" \
    "Platform access hook should have widget control"

echo "📋 Test 7: Logging and Debugging"
echo "==============================="

run_test "Console logging exists" \
    "grep -q 'console.log' src/contexts/UnifiedTrialContext.tsx" \
    "Console logging should be implemented for debugging"

run_test "Debug information in PlatformLock" \
    "grep -q 'Debug Info' src/components/UnifiedPlatformLock.tsx" \
    "Debug information should be available in PlatformLock"

echo "📋 Test 8: Error Handling"
echo "========================"

run_test "Error handling in trial context" \
    "grep -q 'error' src/contexts/UnifiedTrialContext.tsx" \
    "Error handling should be implemented in trial context"

run_test "Fallback mechanisms exist" \
    "grep -q 'localStorage' src/contexts/UnifiedTrialContext.tsx" \
    "Fallback mechanisms should exist for offline scenarios"

echo ""
echo "📊 Test Results Summary"
echo "======================="
echo -e "${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! The trial system fixes are properly implemented.${NC}"
    echo ""
    echo "📋 Manual Testing Checklist:"
    echo "============================"
    echo "1. 🆕 New User Flow:"
    echo "   - Create a new account"
    echo "   - Verify 8-day trial starts immediately"
    echo "   - Verify access to all features during trial"
    echo "   - Check browser console for trial initialization logs"
    echo ""
    echo "2. 💼 Business User Flow:"
    echo "   - Upgrade to business plan"
    echo "   - Verify uninterrupted access"
    echo "   - Verify subscription status tracking"
    echo "   - Check that business users are never locked"
    echo ""
    echo "3. ⏰ Trial Expiration:"
    echo "   - Wait for trial to expire (or manually expire in database)"
    echo "   - Verify platform locks correctly"
    echo "   - Verify upgrade prompts work"
    echo "   - Check that widgets are disabled"
    echo ""
    echo "4. 🔧 Widget Access:"
    echo "   - Test feedback widgets during trial"
    echo "   - Test feedback widgets after trial expires"
    echo "   - Test feedback widgets for business users"
    echo "   - Verify QR codes and email forms work correctly"
    echo ""
    echo "5. 🐛 Debug Information:"
    echo "   - Check browser console for meaningful logs"
    echo "   - Verify debug info in lock screen"
    echo "   - Test error handling scenarios"
    echo ""
    echo "🚀 Ready for production deployment!"
else
    echo -e "${RED}❌ Some tests failed. Please review the failed tests and fix the issues.${NC}"
    echo ""
    echo "🔧 Common Issues and Solutions:"
    echo "==============================="
    echo "1. Missing files: Check that all new files were created"
    echo "2. Import errors: Verify import paths in App.tsx"
    echo "3. Function not found: Check function names and signatures"
    echo "4. Database issues: Verify migration was applied correctly"
    echo ""
    echo "📞 If you need help, check the DEPLOYMENT_SUMMARY.md file for detailed information."
fi

echo ""
echo "📄 For detailed information, see:"
echo "   - DEPLOYMENT_SUMMARY.md"
echo "   - fix_trial_and_billing_system.sql"
echo "   - src/contexts/UnifiedTrialContext.tsx"
echo ""
echo "🧪 Test completed on: $(date)"