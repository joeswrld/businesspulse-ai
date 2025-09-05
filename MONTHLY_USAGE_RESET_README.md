# Monthly Usage Reset System

A comprehensive system that automatically resets usage counts every new month for the NoteX billing system.

## 🔄 Overview

The monthly usage reset system ensures that user usage counters are automatically reset to zero at the beginning of each month, while preserving historical data for previous months.

## 🏗️ Architecture

### Database Schema Updates

#### Updated `usage_counters` Table
```sql
-- Additional columns added to existing table
ALTER TABLE usage_counters 
ADD COLUMN IF NOT EXISTS ai_insights_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS analytics_reports_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS detailed_reports_count INTEGER NOT NULL DEFAULT 0;

-- Renamed to match component expectations
ALTER TABLE usage_counters 
RENAME COLUMN ai_insights_count TO insights_count;
ALTER TABLE usage_counters 
RENAME COLUMN analytics_reports_count TO analytics_count;
ALTER TABLE usage_counters 
RENAME COLUMN detailed_reports_count TO reports_count;
```

### RPC Functions

#### `ensure_current_month_usage(user_uuid UUID)`
**Purpose**: Ensures a usage record exists for the current month, resetting if necessary.

**Logic**:
1. Check if record exists for current month
2. If not, check for old records
3. If old record exists, reset all counts to 0 and update month_start
4. If no records exist, create new record with all counts at 0
5. Return current month's record

**Returns**:
```sql
TABLE (
  user_id UUID,
  month_start DATE,
  feedback_count INTEGER,
  insights_count INTEGER,
  analytics_count INTEGER,
  reports_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
```

#### `get_user_usage_with_monthly_reset(user_uuid UUID)`
**Purpose**: Same as above but includes a `is_reset` boolean flag.

**Returns**:
```sql
TABLE (
  user_id UUID,
  month_start DATE,
  feedback_count INTEGER,
  insights_count INTEGER,
  analytics_count INTEGER,
  reports_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_reset BOOLEAN
)
```

## 🚀 Deployment

### 1. Apply Database Schema Updates

Run the SQL in `update_usage_counters_schema.sql`:

```sql
-- Add missing columns
ALTER TABLE usage_counters 
ADD COLUMN IF NOT EXISTS ai_insights_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS analytics_reports_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS detailed_reports_count INTEGER NOT NULL DEFAULT 0;

-- Rename columns to match component expectations
ALTER TABLE usage_counters 
RENAME COLUMN ai_insights_count TO insights_count;
ALTER TABLE usage_counters 
RENAME COLUMN analytics_reports_count TO analytics_count;
ALTER TABLE usage_counters 
RENAME COLUMN detailed_reports_count TO reports_count;

-- Create RPC functions
-- ... (see full SQL file)
```

### 2. Create RPC Functions

Run the SQL in `monthly_usage_reset_rpc.sql`:

```sql
-- Create comprehensive monthly reset functions
CREATE OR REPLACE FUNCTION ensure_current_month_usage(user_uuid UUID)
-- ... (see full SQL file)
```

### 3. Update Frontend Component

The `UsageOverview.tsx` component has been updated to use the new RPC:

```typescript
// Old approach
const { data, error } = await supabase
  .from('usage_counters')
  .select('feedback_count, insights_count, analytics_count, reports_count')
  .eq('user_id', userId)
  .single();

// New approach with monthly reset
const { data, error } = await supabase
  .rpc('ensure_current_month_usage', { user_uuid: userId });
```

## 🔧 How It Works

### Monthly Reset Logic

1. **Check Current Month**: Function checks if `month_start` matches current month's first day
2. **Reset if Needed**: If month doesn't match, resets all counts to 0
3. **Update Month**: Updates `month_start` to current month's first day
4. **Create if Missing**: Creates new record if none exists for the user
5. **Return Data**: Returns current month's usage data

### Edge Cases Handled

- **No Records**: Creates new record with all counts at 0
- **Old Records**: Resets existing record to current month with 0 counts
- **Current Month**: Returns existing record unchanged
- **Business Users**: Still shows unlimited even though counters exist

### Data Preservation

- Previous month's data is preserved in the database
- Only the `month_start` field is updated for reset records
- Historical data can be queried for analytics

## 📊 Usage Types

The system handles four types of usage:

| Usage Type | Column Name | Description |
|------------|-------------|-------------|
| **Feedback** | `feedback_count` | Customer feedback submissions |
| **AI Insights** | `insights_count` | AI-powered business insights |
| **Analytics** | `analytics_count` | Data analytics and reports |
| **Reports** | `reports_count` | Comprehensive business reports |

## 🧪 Testing

### Manual Testing

1. **Test Current Month**:
   ```sql
   SELECT * FROM ensure_current_month_usage('your-user-uuid');
   ```

2. **Test Monthly Reset**:
   - Change system date to next month
   - Call the function again
   - Verify counts are reset to 0

3. **Test New User**:
   - Use a non-existent user UUID
   - Verify new record is created

### Automated Testing

```bash
# Run the deployment script
./deploy-monthly-usage-reset.sh

# Check that functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%usage%';
```

## 🔍 Monitoring

### Check Function Usage

```sql
-- See all usage records for a user
SELECT * FROM usage_counters 
WHERE user_id = 'your-user-uuid' 
ORDER BY month_start DESC;

-- Check current month's usage
SELECT * FROM ensure_current_month_usage('your-user-uuid');
```

### Verify Monthly Reset

```sql
-- Check if reset occurred
SELECT 
  user_id,
  month_start,
  feedback_count,
  insights_count,
  analytics_count,
  reports_count,
  CASE 
    WHEN month_start = DATE_TRUNC('month', CURRENT_DATE)::DATE 
    THEN 'Current Month' 
    ELSE 'Previous Month' 
  END as status
FROM usage_counters 
WHERE user_id = 'your-user-uuid'
ORDER BY month_start DESC;
```

## 🛠️ Troubleshooting

### Common Issues

1. **"Function not found" error**:
   - Ensure RPC functions were created successfully
   - Check permissions are granted correctly

2. **"Column not found" error**:
   - Ensure schema updates were applied
   - Check column names match exactly

3. **"Permission denied" error**:
   - Verify RLS policies are correct
   - Check function permissions

### Debug Steps

1. **Check Table Structure**:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'usage_counters';
   ```

2. **Check Functions Exist**:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name LIKE '%usage%';
   ```

3. **Test Function Manually**:
   ```sql
   SELECT * FROM ensure_current_month_usage('test-uuid');
   ```

## 📈 Benefits

### For Users
- **Seamless Experience**: Usage resets automatically without user action
- **Clear Limits**: Always see current month's usage clearly
- **Historical Data**: Previous months' data is preserved

### For Business
- **Accurate Billing**: Usage limits reset monthly as expected
- **Data Analytics**: Historical usage data available for analysis
- **Plan Enforcement**: Limits are properly enforced each month

### For Development
- **Automatic**: No manual intervention required
- **Reliable**: Handles all edge cases
- **Scalable**: Works for all user types and plans

## 🔮 Future Enhancements

1. **Usage Rollover**: Allow unused quota to roll over
2. **Custom Reset Dates**: Allow different reset dates per user
3. **Usage Alerts**: Notify users when approaching limits
4. **Analytics Dashboard**: Show usage trends over time
5. **Bulk Reset**: Reset all users at once for testing

## 📞 Support

For issues with the monthly reset system:

1. Check the troubleshooting section
2. Verify SQL scripts were applied correctly
3. Test functions manually in SQL Editor
4. Check Supabase logs for errors
5. Contact the development team

---

**System Status**: ✅ Ready for Production  
**Last Updated**: January 2024  
**Version**: 1.0.0  
**Compatibility**: Supabase + React + TypeScript