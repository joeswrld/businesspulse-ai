// Test file for the usage function
// This file can be used to test the function locally or as a reference for API calls

interface UsageRequest {
  action: 'feedback' | 'analytics' | 'reports' | 'insights' | 'teams'
}

interface UsageResponse {
  success: boolean
  data?: {
    id: string
    user_id: string
    feedback_count: number
    analytics_count: number
    reports_count: number
    insights_count: number
    teams_count: number
    created_at: string
    updated_at: string
  }
  error?: string
}

// Example usage function for testing
async function testUsageFunction(
  supabaseUrl: string,
  accessToken: string,
  action: UsageRequest['action']
): Promise<UsageResponse> {
  const response = await fetch(`${supabaseUrl}/functions/v1/usage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action }),
  })

  return await response.json()
}

// Example test scenarios
export async function runTests(supabaseUrl: string, accessToken: string) {
  console.log('Testing usage function...')

  // Test 1: Valid feedback action
  try {
    const result1 = await testUsageFunction(supabaseUrl, accessToken, 'feedback')
    console.log('Test 1 - Feedback action:', result1)
  } catch (error) {
    console.error('Test 1 failed:', error)
  }

  // Test 2: Valid analytics action
  try {
    const result2 = await testUsageFunction(supabaseUrl, accessToken, 'analytics')
    console.log('Test 2 - Analytics action:', result2)
  } catch (error) {
    console.error('Test 2 failed:', error)
  }

  // Test 3: Invalid action (should fail)
  try {
    const result3 = await testUsageFunction(supabaseUrl, accessToken, 'invalid' as any)
    console.log('Test 3 - Invalid action:', result3)
  } catch (error) {
    console.error('Test 3 failed:', error)
  }

  // Test 4: Missing token (should fail)
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'feedback' }),
    })
    const result4 = await response.json()
    console.log('Test 4 - Missing token:', result4)
  } catch (error) {
    console.error('Test 4 failed:', error)
  }
}

// Example cURL commands for testing:
/*
# Test with valid action
curl -X POST 'https://your-project.supabase.co/functions/v1/usage' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"action": "feedback"}'

# Test with invalid action
curl -X POST 'https://your-project.supabase.co/functions/v1/usage' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"action": "invalid"}'

# Test without authentication
curl -X POST 'https://your-project.supabase.co/functions/v1/usage' \
  -H 'Content-Type: application/json' \
  -d '{"action": "feedback"}'
*/