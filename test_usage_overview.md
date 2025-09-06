# Usage Overview Fix - Testing Guide

## Problem Identified
The Usage Overview in the billing section was not reading user usage data because:

1. **Schema Mismatch**: The `UsageOverview` component was trying to use RPC functions (`ensure_current_month_usage`) that expected a different database schema than what was actually deployed.

2. **Missing Columns**: The `usage_counters` table was missing the required columns (`insights_count`, `analytics_count`, `reports_count`) that the component expected.

3. **RPC Function Issues**: The RPC functions were expecting a `month_start` column that didn't exist in the actual database schema.

## Solution Implemented

### 1. Updated UsageOverview Component
- **Fixed Data Fetching**: Updated the component to first try to fetch from the `usage_counters` table, and if that fails, use the `refresh_user_usage` RPC function to populate the data.
- **Added Fallback Logic**: If the usage_counters table doesn't exist or is empty, the component will call the refresh function to populate it with actual usage data from source tables.
- **Enhanced Refresh Function**: The manual refresh button now calls the database refresh function before reloading the component data.

### 2. Created Database Fix Script
- **Schema Update**: Added missing columns to the `usage_counters` table if they don't exist.
- **Data Population**: Created a script that populates the `usage_counters` table with actual usage data from source tables.
- **RPC Function**: Created a `refresh_user_usage` function that can be called to update usage data for a specific user.

## Files Modified

1. **`src/components/billing/UsageOverview.tsx`**
   - Updated data fetching logic to work with actual database schema
   - Added fallback to refresh usage data if table is empty
   - Enhanced refresh functionality

2. **`fix_usage_overview.sql`** (New)
   - Database migration script to fix schema and populate data
   - Creates the `refresh_user_usage` RPC function

## How to Test

### 1. Apply Database Fix
```sql
-- Run the fix_usage_overview.sql script in your Supabase SQL editor
-- This will:
-- - Add missing columns to usage_counters table
-- - Populate the table with actual usage data
-- - Create the refresh_user_usage function
```

### 2. Test the Usage Overview
1. Navigate to the Billing page in your application
2. Check that the Usage Overview section now shows actual usage data
3. Verify that the usage counts match the actual data in your database
4. Test the refresh button to ensure it updates the data

### 3. Verify Data Accuracy
The usage counts should reflect:
- **Feedback Count**: Number of feedback entries for the user's projects
- **Insights Count**: Number of AI insights generated for the user
- **Analytics Count**: Number of analytics reports for the user
- **Reports Count**: Number of detailed reports for the user

## Expected Behavior

After applying the fix:
1. The Usage Overview should display actual usage numbers instead of zeros
2. The refresh button should update the data in real-time
3. Usage limits should be properly calculated and displayed
4. Progress bars should show accurate usage percentages
5. Warning messages should appear when approaching limits

## Troubleshooting

If the Usage Overview still shows zeros:
1. Check that the `fix_usage_overview.sql` script was executed successfully
2. Verify that the user has actual data in the source tables (feedbacks, ai_insights, etc.)
3. Check the browser console for any error messages
4. Try clicking the refresh button to manually update the data

## Database Schema

The `usage_counters` table should now have:
- `user_id` (UUID, Primary Key)
- `feedback_count` (INTEGER)
- `insights_count` (INTEGER) 
- `analytics_count` (INTEGER)
- `reports_count` (INTEGER)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)